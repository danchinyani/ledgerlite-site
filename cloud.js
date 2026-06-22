(function () {
  const config = window.ledgerLiteConfig || {};
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey && window.supabase?.createClient);
  const client = configured
    ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
  let workspaceId = "";
  let user = null;
  let syncTimer = null;
  let syncing = false;
  let workspaceCreated = false;
  let snapshotVersion = 0;
  let syncPaused = false;
  let syncRequested = false;
  let latestState = null;

  function cleanState(state) {
    const { session, cloud, notificationSettings, subscription, ...data } = state;
    return data;
  }

  function workspacePayload(state) {
    const payments = String(state.business?.payments || "Cash")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return {
      name: state.business?.name || "New Business",
      business_type: state.business?.type || "Retail shop",
      phone: state.business?.phone || "",
      location: state.business?.location || "",
      currency: state.business?.currency || "USD",
      payment_methods: payments.length ? payments : ["Cash"]
    };
  }

  function slugFor(name) {
    const base = String(name || "business").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business";
    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
  }

  async function requireUser() {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    user = data.user;
    return user;
  }

  async function findWorkspace() {
    const { data, error } = await client
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    workspaceId = data?.workspace_id || "";
    workspaceCreated = false;
    return data;
  }

  async function createWorkspace(state) {
    const details = workspacePayload(state);
    const { data, error } = await client
      .from("workspaces")
      .insert({ ...details, slug: slugFor(details.name), owner_user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    workspaceId = data.id;
    workspaceCreated = true;
    return workspaceId;
  }

  async function ensureWorkspace(state) {
    const membership = await findWorkspace();
    if (membership) return workspaceId;
    return createWorkspace(state);
  }

  async function pullState() {
    if (!client || !workspaceId) return null;
    const [snapshotResult, workspaceResult, subscriptionResult] = await Promise.all([
      client.from("workspace_snapshots").select("data, version, updated_at").eq("workspace_id", workspaceId).maybeSingle(),
      client.from("workspaces").select("*").eq("id", workspaceId).single(),
      client.from("subscriptions").select("*").eq("workspace_id", workspaceId).single()
    ]);
    if (snapshotResult.error) throw snapshotResult.error;
    if (workspaceResult.error) throw workspaceResult.error;
    if (subscriptionResult.error) throw subscriptionResult.error;
    snapshotVersion = Number(snapshotResult.data?.version || 0);
    return {
      data: snapshotResult.data?.data || null,
      version: snapshotResult.data?.version || 0,
      workspace: workspaceResult.data,
      subscription: subscriptionResult.data
    };
  }

  function reportConflict(remote) {
    syncPaused = true;
    window.dispatchEvent(new CustomEvent("ledgerlite:cloud-conflict", {
      detail: {
        workspaceId,
        localVersion: snapshotVersion,
        remoteVersion: Number(remote?.version || 0),
        remoteUpdatedAt: remote?.updated_at || ""
      }
    }));
  }

  async function fetchSnapshot() {
    const { data, error } = await client
      .from("workspace_snapshots")
      .select("data, version, updated_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function writeSnapshot(state) {
    const payload = { workspace_id: workspaceId, data: cleanState(state), updated_by: user.id };
    let result;
    if (snapshotVersion === 0) {
      result = await client.from("workspace_snapshots").insert(payload).select("version, updated_at").single();
    } else {
      result = await client
        .from("workspace_snapshots")
        .update({ data: payload.data, updated_by: user.id })
        .eq("workspace_id", workspaceId)
        .eq("version", snapshotVersion)
        .select("version, updated_at")
        .maybeSingle();
    }
    if (result.error) {
      const remote = await fetchSnapshot();
      if (remote && Number(remote.version) !== snapshotVersion) {
        reportConflict(remote);
        return false;
      }
      throw result.error;
    }
    if (!result.data) {
      reportConflict(await fetchSnapshot());
      return false;
    }
    snapshotVersion = Number(result.data.version || snapshotVersion + 1);
    return true;
  }

  async function syncConsents(state) {
    const rows = (state.recurringContracts || [])
      .filter((contract) => contract.consentAt)
      .map((contract) => {
        const customer = (state.customers || []).find((entry) => entry.id === contract.customerId);
        return customer?.phone
          ? {
              workspace_id: workspaceId,
              customer_local_id: customer.id,
              channel: "whatsapp",
              recipient: customer.phone,
              status: "granted",
              granted_at: contract.consentAt,
              recorded_by: user.id
            }
          : null;
      })
      .filter(Boolean);
    if (!rows.length) return;
    const { error } = await client.from("message_consents").upsert(rows, { onConflict: "workspace_id,customer_local_id,channel" });
    if (error) throw error;
  }

  async function pushState(state, immediate = false) {
    if (!client || !workspaceId || !user) return;
    latestState = state;
    if (syncPaused) return;
    if (syncing) {
      syncRequested = true;
      return;
    }
    const run = async () => {
      if (syncPaused || syncing) return;
      syncing = true;
      try {
        const stateToWrite = latestState;
        if (!await writeSnapshot(stateToWrite)) return false;
        await syncConsents(stateToWrite);
        window.dispatchEvent(new CustomEvent("ledgerlite:cloud-synced", { detail: { workspaceId, version: snapshotVersion } }));
        return true;
      } finally {
        syncing = false;
        if (syncRequested && !syncPaused) {
          syncRequested = false;
          queueMicrotask(() => run().catch((error) => window.dispatchEvent(new CustomEvent("ledgerlite:cloud-error", { detail: error.message }))));
        }
      }
    };
    if (immediate) return run();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => run().catch((error) => window.dispatchEvent(new CustomEvent("ledgerlite:cloud-error", { detail: error.message }))), 700);
  }

  async function resolveConflict(choice, state) {
    if (!client || !workspaceId || !user) throw new Error("Cloud workspace unavailable.");
    const remote = await fetchSnapshot();
    if (!remote) throw new Error("The cloud copy could not be found.");
    snapshotVersion = Number(remote.version || 0);
    syncPaused = false;
    syncRequested = false;
    if (choice === "cloud") return pullState();
    if (choice !== "device") throw new Error("Unknown conflict choice.");
    const saved = await pushState(state, true);
    return { version: snapshotVersion, conflict: saved === false };
  }

  async function updateWorkspace(state) {
    if (!client || !workspaceId) return;
    const { error } = await client.from("workspaces").update(workspacePayload(state)).eq("id", workspaceId);
    if (error) throw error;
    return pushState(state, true);
  }

  async function signIn(email, password) {
    if (!client) throw new Error("Cloud accounts are not configured yet.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    user = data.user;
    return data;
  }

  async function signUp(email, password) {
    if (!client) throw new Error("Cloud accounts are not configured yet.");
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
    user = data.user;
    return data;
  }

  async function resetPassword(email) {
    if (!client) throw new Error("Cloud accounts are not configured yet.");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    if (error) throw error;
  }

  async function resendConfirmation(email) {
    if (!client) throw new Error("Cloud accounts are not configured yet.");
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    user = null;
    workspaceId = "";
    snapshotVersion = 0;
    syncPaused = false;
    syncRequested = false;
    latestState = null;
  }

  async function requestPlan(plan, cycle, paymentMethod, reference = "") {
    if (!client || !workspaceId || !user) throw new Error("Sign in to request a plan.");
    const prices = { Starter: { monthly: 5, annual: 50 }, Business: { monthly: 10, annual: 100 }, Pro: { monthly: 20, annual: 200 } };
    const { data, error } = await client.from("payment_requests").insert({
      workspace_id: workspaceId,
      requested_by: user.id,
      plan,
      cycle,
      amount_usd: prices[plan][cycle],
      payment_method: paymentMethod,
      payment_reference: reference || null
    }).select("id, status").single();
    if (error) throw error;
    return data;
  }

  async function inviteStaff(email, role) {
    if (!client || !workspaceId) throw new Error("Cloud workspace unavailable.");
    const { data, error } = await client.functions.invoke("workspace-invite", { body: { workspaceId, email, role } });
    if (error) throw error;
    return data;
  }

  async function privacyAction(action) {
    if (!client || !workspaceId) throw new Error("Cloud workspace unavailable.");
    const { data, error } = await client.functions.invoke("privacy-account", { body: { action, workspaceId } });
    if (error) throw error;
    return data;
  }

  async function getCloudHealth() {
    if (!client || !workspaceId) throw new Error("Cloud workspace unavailable.");
    const [workspace, snapshot, subscription, members, messages, payments, notifications, audit] = await Promise.all([
      client.from("workspaces").select("id,name,status,updated_at").eq("id", workspaceId).single(),
      client.from("workspace_snapshots").select("version,updated_at").eq("workspace_id", workspaceId).maybeSingle(),
      client.from("subscriptions").select("plan,cycle,status,trial_ends_at,current_period_ends_at").eq("workspace_id", workspaceId).single(),
      client.from("workspace_members").select("user_id,role,active,created_at").eq("workspace_id", workspaceId).eq("active", true),
      client.from("scheduled_messages").select("id,status,scheduled_for,sent_at,delivered_at,last_error").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
      client.from("payment_requests").select("id,plan,cycle,status,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(10),
      client.from("notification_events").select("id,type,severity,title,created_at,read_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(20),
      client.from("audit_logs").select("id,action,entity_type,created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(12)
    ]);
    const failed = [workspace, snapshot, subscription, members, messages, payments, notifications, audit].find((result) => result.error);
    if (failed?.error) throw failed.error;
    return {
      workspace: workspace.data,
      snapshot: snapshot.data,
      subscription: subscription.data,
      members: members.data || [],
      messages: messages.data || [],
      paymentRequests: payments.data || [],
      notifications: notifications.data || [],
      audit: audit.data || [],
      checkedAt: new Date().toISOString()
    };
  }

  async function bootstrap(state) {
    if (!client) return { configured: false };
    const { data } = await client.auth.getSession();
    if (!data.session) return { configured: true, authenticated: false };
    await requireUser();
    await ensureWorkspace(state);
    const remote = await pullState();
    return { configured: true, authenticated: true, user, workspaceId, created: workspaceCreated, ...remote };
  }

  window.LedgerCloud = {
    configured,
    bootstrap,
    signIn,
    signUp,
    resetPassword,
    resendConfirmation,
    signOut,
    ensureWorkspace,
    pullState,
    pushState,
    resolveConflict,
    updateWorkspace,
    requestPlan,
    inviteStaff,
    privacyAction,
    getCloudHealth,
    get workspaceId() { return workspaceId; },
    get user() { return user; }
  };
})();
