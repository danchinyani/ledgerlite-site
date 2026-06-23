const storageKey = "ledgerlite-v0";

const seedData = {
  session: { loggedIn: false, identity: "" },
  cloud: { enabled: false, workspaceId: "", syncStatus: "local", lastSyncedAt: "", error: "" },
  business: {
    isSetup: false,
    name: "Your Business",
    type: "Retail shop",
    phone: "+263771000000",
    location: "Harare",
    currency: "USD",
    payments: "Cash, EcoCash, Innbucks, Bank Transfer"
  },
  staff: [
    { id: "u1", name: "Business Owner", role: "Owner" },
    { id: "u2", name: "Front Desk", role: "Cashier" }
  ],
  customers: [
    { id: "c1", name: "Tariro Moyo", phone: "+263771234567", balance: 18 },
    { id: "c2", name: "Blessing Ncube", phone: "+263772555111", balance: 0 },
    { id: "c3", name: "Rudo Superette", phone: "+263773900222", balance: 42.5 }
  ],
  items: [
    { id: "i1", name: "Cooking Oil 2L", price: 4.5, stock: 24 },
    { id: "i2", name: "Maize Meal 10kg", price: 7.25, stock: 16 },
    { id: "i3", name: "Sugar 2kg", price: 2.4, stock: 34 },
    { id: "i4", name: "Laundry Soap", price: 1.25, stock: 9 }
  ],
  sales: [
    {
      id: "s1",
      receipt: "DL-1001",
      customerId: "c1",
      itemId: "i2",
      quantity: 2,
      currency: "USD",
      method: "Cash",
      total: 14.5,
      paid: 10,
      balance: 4.5,
      notes: "Part payment",
      createdAt: new Date().toISOString()
    },
    {
      id: "s2",
      receipt: "DL-1002",
      customerId: "c2",
      itemId: "i1",
      quantity: 1,
      currency: "USD",
      method: "EcoCash",
      total: 4.5,
      paid: 4.5,
      balance: 0,
      notes: "",
      createdAt: new Date().toISOString()
    }
  ],
  payments: [],
  expenses: [],
  quotes: [],
  leads: [],
  recurringContracts: [],
  reminders: [],
  notificationSettings: {
    deviceEnabled: false,
    reviewedAt: "",
    reviewedAlertIds: []
  },
  subscription: {
    plan: "Starter",
    cycle: "monthly",
    status: "trial",
    trialStartedAt: new Date().toISOString(),
    trialEndsAt: "",
    renewalDate: "",
    paymentMethod: "EcoCash USD",
    billingContact: "",
    pendingPlan: ""
  },
  quoteCounter: 2001,
  receiptCounter: 1003
};

let state = loadState();
let selectedCustomerId = null;
let lastReceipt = null;
let lastQuote = null;
let deferredInstallPrompt = null;
let cloudHealth = null;
let cloudHealthLoading = false;
let setupStep = 1;
let authMode = localStorage.getItem("ledgerlite-account-created") === "true" ? "signin" : "signup";
let saleDraftLines = [];
let quoteDraftLines = [];

const businessPresets = {
  "Retail shop": {
    title: "Retail shop setup",
    customerLabel: "Customer",
    itemLabel: "Product",
    itemNameLabel: "Product name",
    kit: ["Stock tracking", "Receipts", "Customer balances", "Low-stock alerts"],
    items: [
      { name: "Cooking Oil 2L", price: 4.5, stock: 24 },
      { name: "Maize Meal 10kg", price: 7.25, stock: 16 },
      { name: "Sugar 2kg", price: 2.4, stock: 34 }
    ]
  },
  "Salon or barber": {
    title: "Salon and barber setup",
    customerLabel: "Client",
    itemLabel: "Service",
    itemNameLabel: "Service name",
    kit: ["Client balances", "Service sales", "Cash-up reports", "WhatsApp reminders"],
    items: [
      { name: "Haircut", price: 5, stock: 0, isService: true },
      { name: "Braiding", price: 20, stock: 0, isService: true },
      { name: "Wash and treatment", price: 10, stock: 0, isService: true }
    ]
  },
  "School or training centre": {
    title: "School and training centre setup",
    customerLabel: "Parent / student",
    itemLabel: "Fee or service",
    itemNameLabel: "Fee name",
    kit: ["Fee balances", "Parent reminders", "Receipts", "Payment reports"],
    items: [
      { name: "Monthly tuition", price: 45, stock: 0, isService: true },
      { name: "Registration fee", price: 20, stock: 0, isService: true },
      { name: "Uniform payment", price: 25, stock: 0, isService: true }
    ]
  },
  "Clinic or health practice": {
    title: "Clinic setup",
    customerLabel: "Patient",
    itemLabel: "Service",
    itemNameLabel: "Service name",
    kit: ["Patient payments", "Consultation fees", "Follow-up balances", "Daily cash reports"],
    items: [
      { name: "Consultation", price: 15, stock: 0, isService: true },
      { name: "Review visit", price: 8, stock: 0, isService: true },
      { name: "Basic test", price: 10, stock: 0, isService: true }
    ]
  },
  "Landlord or property manager": {
    title: "Landlord setup",
    customerLabel: "Tenant",
    itemLabel: "Rent / charge",
    itemNameLabel: "Charge name",
    kit: ["Rent balances", "Tenant reminders", "Payment history", "Expense tracking"],
    items: [
      { name: "Monthly rent", price: 120, stock: 0, isService: true },
      { name: "Water bill", price: 10, stock: 0, isService: true },
      { name: "Maintenance charge", price: 15, stock: 0, isService: true }
    ]
  },
  "Church or ministry": {
    title: "Church and ministry setup",
    customerLabel: "Member",
    itemLabel: "Giving / event",
    itemNameLabel: "Giving or event name",
    kit: ["Member records", "Giving tracking", "Event payments", "Reports"],
    items: [
      { name: "Tithe", price: 10, stock: 0, isService: true },
      { name: "Offering", price: 5, stock: 0, isService: true },
      { name: "Event contribution", price: 20, stock: 0, isService: true }
    ]
  },
  "Farm or produce seller": {
    title: "Farm and produce setup",
    customerLabel: "Buyer",
    itemLabel: "Produce",
    itemNameLabel: "Produce name",
    kit: ["Produce sales", "Buyer balances", "Order records", "Cash reports"],
    items: [
      { name: "Tomatoes crate", price: 8, stock: 20 },
      { name: "Potatoes 10kg", price: 6, stock: 30 },
      { name: "Green mealies dozen", price: 4, stock: 25 }
    ]
  },
  "Other service business": {
    title: "Service business setup",
    customerLabel: "Client",
    itemLabel: "Service",
    itemNameLabel: "Service name",
    kit: ["Service sales", "Client balances", "Receipts", "Expense tracking"],
    items: [
      { name: "Standard service", price: 20, stock: 0, isService: true },
      { name: "Call-out fee", price: 10, stock: 0, isService: true },
      { name: "Monthly retainer", price: 50, stock: 0, isService: true }
    ]
  }
};

const els = {
  authScreen: document.querySelector("#authScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginIdentity: document.querySelector("#loginIdentity"),
  loginPassword: document.querySelector("#loginPassword"),
  demoLogin: document.querySelector("#demoLogin"),
  signInMode: document.querySelector("#signInMode"),
  createAccount: document.querySelector("#createAccount"),
  resetPassword: document.querySelector("#resetPassword"),
  resendConfirmation: document.querySelector("#resendConfirmation"),
  authSubmit: document.querySelector("#authSubmit"),
  authFormTitle: document.querySelector("#authFormTitle"),
  authFormCopy: document.querySelector("#authFormCopy"),
  loginConfirmWrap: document.querySelector("#loginConfirmWrap"),
  loginConfirmPassword: document.querySelector("#loginConfirmPassword"),
  cloudAuthStatus: document.querySelector("#cloudAuthStatus"),
  authHelpActions: document.querySelector("#authHelpActions"),
  authCreateHelp: document.querySelector("#authCreateHelp"),
  authResetHelp: document.querySelector("#authResetHelp"),
  cloudSyncStatus: document.querySelector("#cloudSyncStatus"),
  cloudConflictBanner: document.querySelector("#cloudConflictBanner"),
  cloudConflictCopy: document.querySelector("#cloudConflictCopy"),
  useCloudVersion: document.querySelector("#useCloudVersion"),
  keepDeviceVersion: document.querySelector("#keepDeviceVersion"),
  addSaleLine: document.querySelector("#addSaleLine"),
  saleDraftLines: document.querySelector("#saleDraftLines"),
  saleDraftTotal: document.querySelector("#saleDraftTotal"),
  saveSale: document.querySelector("#saveSale"),
  addQuoteLine: document.querySelector("#addQuoteLine"),
  quoteDraftLines: document.querySelector("#quoteDraftLines"),
  quoteDraftTotal: document.querySelector("#quoteDraftTotal"),
  saveQuote: document.querySelector("#saveQuote"),
  setupModal: document.querySelector("#setupModal"),
  setupForm: document.querySelector("#setupForm"),
  setupBusinessName: document.querySelector("#setupBusinessName"),
  setupBusinessType: document.querySelector("#setupBusinessType"),
  setupBusinessTypeOtherWrap: document.querySelector("#setupBusinessTypeOtherWrap"),
  setupBusinessTypeOther: document.querySelector("#setupBusinessTypeOther"),
  setupBusinessPhone: document.querySelector("#setupBusinessPhone"),
  setupBusinessLocation: document.querySelector("#setupBusinessLocation"),
  setupBusinessCurrency: document.querySelector("#setupBusinessCurrency"),
  setupPaymentOptions: [...document.querySelectorAll('[name="setupPayment"]')],
  setupStartModes: [...document.querySelectorAll('[name="setupStartMode"]')],
  setupTermsConfirmed: document.querySelector("#setupTermsConfirmed"),
  setupSteps: [...document.querySelectorAll("[data-setup-step]")],
  setupProgress: [...document.querySelectorAll(".setup-progress span")],
  setupStepLabel: document.querySelector("#setupStepLabel"),
  setupReview: document.querySelector("#setupReview"),
  setupBack: document.querySelector("#setupBack"),
  setupNext: document.querySelector("#setupNext"),
  setupSubmit: document.querySelector("#setupSubmit"),
  viewTitle: document.querySelector("#viewTitle"),
  connectionStatus: document.querySelector("#connectionStatus"),
  businessAlertButton: document.querySelector("#businessAlertButton"),
  businessAlertCount: document.querySelector("#businessAlertCount"),
  globalSearch: document.querySelector("#globalSearch"),
  globalSearchResults: document.querySelector("#globalSearchResults"),
  navItems: [...document.querySelectorAll(".nav-item")],
  views: [...document.querySelectorAll(".view")],
  activeBusinessName: document.querySelector("#activeBusinessName"),
  activeBusinessMeta: document.querySelector("#activeBusinessMeta"),
  businessKitTitle: document.querySelector("#businessKitTitle"),
  businessKitCopy: document.querySelector("#businessKitCopy"),
  businessKitList: document.querySelector("#businessKitList"),
  applyPreset: document.querySelector("#applyPreset"),
  installApp: document.querySelector("#installApp"),
  backupNow: document.querySelector("#backupNow"),
  installStatus: document.querySelector("#installStatus"),
  offlineStatus: document.querySelector("#offlineStatus"),
  backupStatus: document.querySelector("#backupStatus"),
  onboardingProgress: document.querySelector("#onboardingProgress"),
  onboardingChecklist: document.querySelector("#onboardingChecklist"),
  todayCollected: document.querySelector("#todayCollected"),
  outstanding: document.querySelector("#outstanding"),
  stockValue: document.querySelector("#stockValue"),
  monthRevenue: document.querySelector("#monthRevenue"),
  healthScore: document.querySelector("#healthScore"),
  healthStatus: document.querySelector("#healthStatus"),
  healthRiskCount: document.querySelector("#healthRiskCount"),
  healthChecks: document.querySelector("#healthChecks"),
  insightCount: document.querySelector("#insightCount"),
  smartInsights: document.querySelector("#smartInsights"),
  dailyCloseDate: document.querySelector("#dailyCloseDate"),
  closeReceived: document.querySelector("#closeReceived"),
  closeExpenses: document.querySelector("#closeExpenses"),
  closeCredit: document.querySelector("#closeCredit"),
  closeNet: document.querySelector("#closeNet"),
  dailyCloseNotes: document.querySelector("#dailyCloseNotes"),
  copyDailyClose: document.querySelector("#copyDailyClose"),
  attentionList: document.querySelector("#attentionList"),
  recentSales: document.querySelector("#recentSales"),
  saleForm: document.querySelector("#saleForm"),
  saleCustomerLabel: document.querySelector("#saleCustomerLabel"),
  saleCustomer: document.querySelector("#saleCustomer"),
  manualCustomer: document.querySelector("#manualCustomer"),
  saleItemLabel: document.querySelector("#saleItemLabel"),
  saleItem: document.querySelector("#saleItem"),
  manualItem: document.querySelector("#manualItem"),
  manualItemPrice: document.querySelector("#manualItemPrice"),
  saleQuantity: document.querySelector("#saleQuantity"),
  saleCurrency: document.querySelector("#saleCurrency"),
  paymentMethod: document.querySelector("#paymentMethod"),
  amountPaid: document.querySelector("#amountPaid"),
  saleNotes: document.querySelector("#saleNotes"),
  receiptNumber: document.querySelector("#receiptNumber"),
  receiptPreview: document.querySelector("#receiptPreview"),
  copyReceipt: document.querySelector("#copyReceipt"),
  whatsappReceipt: document.querySelector("#whatsappReceipt"),
  printReceipt: document.querySelector("#printReceipt"),
  quoteForm: document.querySelector("#quoteForm"),
  quoteNumber: document.querySelector("#quoteNumber"),
  quoteCustomer: document.querySelector("#quoteCustomer"),
  quoteManualCustomer: document.querySelector("#quoteManualCustomer"),
  quoteItem: document.querySelector("#quoteItem"),
  quoteManualItem: document.querySelector("#quoteManualItem"),
  quoteManualPrice: document.querySelector("#quoteManualPrice"),
  quoteQuantity: document.querySelector("#quoteQuantity"),
  quoteCurrency: document.querySelector("#quoteCurrency"),
  quoteValidDays: document.querySelector("#quoteValidDays"),
  quoteNotes: document.querySelector("#quoteNotes"),
  quotePreview: document.querySelector("#quotePreview"),
  copyQuote: document.querySelector("#copyQuote"),
  whatsappQuote: document.querySelector("#whatsappQuote"),
  printQuote: document.querySelector("#printQuote"),
  quoteCount: document.querySelector("#quoteCount"),
  quoteList: document.querySelector("#quoteList"),
  followupDebtorCount: document.querySelector("#followupDebtorCount"),
  followupQuoteCount: document.querySelector("#followupQuoteCount"),
  followupValue: document.querySelector("#followupValue"),
  paymentFollowups: document.querySelector("#paymentFollowups"),
  quoteFollowups: document.querySelector("#quoteFollowups"),
  paymentForm: document.querySelector("#paymentForm"),
  paymentCustomer: document.querySelector("#paymentCustomer"),
  paymentAmount: document.querySelector("#paymentAmount"),
  paymentCurrency: document.querySelector("#paymentCurrency"),
  paymentMethodCollect: document.querySelector("#paymentMethodCollect"),
  paymentNote: document.querySelector("#paymentNote"),
  paymentCount: document.querySelector("#paymentCount"),
  recentPayments: document.querySelector("#recentPayments"),
  customerForm: document.querySelector("#customerForm"),
  customerName: document.querySelector("#customerName"),
  customerPhone: document.querySelector("#customerPhone"),
  customerCount: document.querySelector("#customerCount"),
  customerList: document.querySelector("#customerList"),
  customerProfileTitle: document.querySelector("#customerProfileTitle"),
  customerProfileStatus: document.querySelector("#customerProfileStatus"),
  customerProfile: document.querySelector("#customerProfile"),
  importCustomersBtn: document.querySelector("#importCustomersBtn"),
  importCustomersBtnReports: document.querySelector("#importCustomersBtnReports"),
  importCustomersFile: document.querySelector("#importCustomersFile"),
  downloadCustomersTemplate: document.querySelector("#downloadCustomersTemplate"),
  customerSearch: document.querySelector("#customerSearch"),
  customerFilter: document.querySelector("#customerFilter"),
  recurringForm: document.querySelector("#recurringForm"),
  recurringCustomer: document.querySelector("#recurringCustomer"),
  recurringService: document.querySelector("#recurringService"),
  recurringAmount: document.querySelector("#recurringAmount"),
  recurringCurrency: document.querySelector("#recurringCurrency"),
  recurringBillingDay: document.querySelector("#recurringBillingDay"),
  recurringLeadDays: document.querySelector("#recurringLeadDays"),
  recurringConsent: document.querySelector("#recurringConsent"),
  recurringActiveCount: document.querySelector("#recurringActiveCount"),
  recurringMonthlyValue: document.querySelector("#recurringMonthlyValue"),
  remindersReadyCount: document.querySelector("#remindersReadyCount"),
  remindersSentCount: document.querySelector("#remindersSentCount"),
  recurringContractCount: document.querySelector("#recurringContractCount"),
  recurringContractList: document.querySelector("#recurringContractList"),
  reminderFilter: document.querySelector("#reminderFilter"),
  reminderQueue: document.querySelector("#reminderQueue"),
  itemForm: document.querySelector("#itemForm"),
  itemNameLabel: document.querySelector("#itemNameLabel"),
  itemName: document.querySelector("#itemName"),
  itemPrice: document.querySelector("#itemPrice"),
  itemStock: document.querySelector("#itemStock"),
  itemCount: document.querySelector("#itemCount"),
  inventoryTable: document.querySelector("#inventoryTable"),
  importItemsBtn: document.querySelector("#importItemsBtn"),
  importItemsBtnReports: document.querySelector("#importItemsBtnReports"),
  importItemsFile: document.querySelector("#importItemsFile"),
  downloadItemsTemplate: document.querySelector("#downloadItemsTemplate"),
  inventorySearch: document.querySelector("#inventorySearch"),
  inventoryFilter: document.querySelector("#inventoryFilter"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseCurrency: document.querySelector("#expenseCurrency"),
  expenseMethod: document.querySelector("#expenseMethod"),
  expenseDescription: document.querySelector("#expenseDescription"),
  expenseCount: document.querySelector("#expenseCount"),
  recentExpenses: document.querySelector("#recentExpenses"),
  importExpensesBtn: document.querySelector("#importExpensesBtn"),
  importExpensesBtnReports: document.querySelector("#importExpensesBtnReports"),
  importExpensesFile: document.querySelector("#importExpensesFile"),
  downloadExpensesTemplate: document.querySelector("#downloadExpensesTemplate"),
  expenseSearch: document.querySelector("#expenseSearch"),
  expenseFilter: document.querySelector("#expenseFilter"),
  reportTotalSales: document.querySelector("#reportTotalSales"),
  reportTotalReceived: document.querySelector("#reportTotalReceived"),
  reportTotalExpenses: document.querySelector("#reportTotalExpenses"),
  reportNetCash: document.querySelector("#reportNetCash"),
  reportOutstanding: document.querySelector("#reportOutstanding"),
  reportLowStock: document.querySelector("#reportLowStock"),
  reportDebtors: document.querySelector("#reportDebtors"),
  reportStock: document.querySelector("#reportStock"),
  enableBrowserNotifications: document.querySelector("#enableBrowserNotifications"),
  markNotificationsRead: document.querySelector("#markNotificationsRead"),
  notificationFilter: document.querySelector("#notificationFilter"),
  notificationList: document.querySelector("#notificationList"),
  urgentNotificationCount: document.querySelector("#urgentNotificationCount"),
  actionNotificationCount: document.querySelector("#actionNotificationCount"),
  reviewNotificationCount: document.querySelector("#reviewNotificationCount"),
  deviceNotificationStatus: document.querySelector("#deviceNotificationStatus"),
  exportSalesCsv: document.querySelector("#exportSalesCsv"),
  exportCustomersCsv: document.querySelector("#exportCustomersCsv"),
  exportExpensesCsv: document.querySelector("#exportExpensesCsv"),
  activityFeed: document.querySelector("#activityFeed"),
  activitySearch: document.querySelector("#activitySearch"),
  activityFilter: document.querySelector("#activityFilter"),
  businessForm: document.querySelector("#businessForm"),
  businessName: document.querySelector("#businessName"),
  businessType: document.querySelector("#businessType"),
  businessTypeOtherWrap: document.querySelector("#businessTypeOtherWrap"),
  businessTypeOther: document.querySelector("#businessTypeOther"),
  businessPhone: document.querySelector("#businessPhone"),
  businessLocation: document.querySelector("#businessLocation"),
  businessCurrency: document.querySelector("#businessCurrency"),
  businessPayments: document.querySelector("#businessPayments"),
  settingsPresetTitle: document.querySelector("#settingsPresetTitle"),
  settingsPresetCopy: document.querySelector("#settingsPresetCopy"),
  applyPresetSettings: document.querySelector("#applyPresetSettings"),
  staffForm: document.querySelector("#staffForm"),
  staffName: document.querySelector("#staffName"),
  staffEmail: document.querySelector("#staffEmail"),
  staffRole: document.querySelector("#staffRole"),
  staffCount: document.querySelector("#staffCount"),
  staffList: document.querySelector("#staffList"),
  currentPlanName: document.querySelector("#currentPlanName"),
  subscriptionStatus: document.querySelector("#subscriptionStatus"),
  planStatusCopy: document.querySelector("#planStatusCopy"),
  planDateLabel: document.querySelector("#planDateLabel"),
  planRenewalDate: document.querySelector("#planRenewalDate"),
  pendingPlanNotice: document.querySelector("#pendingPlanNotice"),
  usagePlanLabel: document.querySelector("#usagePlanLabel"),
  workspaceUsage: document.querySelector("#workspaceUsage"),
  pricingPlans: document.querySelector("#pricingPlans"),
  billingCycleButtons: [...document.querySelectorAll("[data-billing-cycle]")],
  billingForm: document.querySelector("#billingForm"),
  billingPaymentMethod: document.querySelector("#billingPaymentMethod"),
  billingContact: document.querySelector("#billingContact"),
  requestActivation: document.querySelector("#requestActivation"),
  exportData: document.querySelector("#exportData"),
  backupData: document.querySelector("#backupData"),
  restoreDataBtn: document.querySelector("#restoreDataBtn"),
  restoreDataFile: document.querySelector("#restoreDataFile"),
  clearData: document.querySelector("#clearData"),
  cloudSecurityStatus: document.querySelector("#cloudSecurityStatus"),
  cloudExportData: document.querySelector("#cloudExportData"),
  requestWorkspaceDeletion: document.querySelector("#requestWorkspaceDeletion"),
  refreshCloudHealth: document.querySelector("#refreshCloudHealth"),
  cloudHealthUpdated: document.querySelector("#cloudHealthUpdated"),
  cloudMetricSync: document.querySelector("#cloudMetricSync"),
  cloudMetricSyncMeta: document.querySelector("#cloudMetricSyncMeta"),
  cloudMetricTeam: document.querySelector("#cloudMetricTeam"),
  cloudMetricTeamMeta: document.querySelector("#cloudMetricTeamMeta"),
  cloudMetricMessages: document.querySelector("#cloudMetricMessages"),
  cloudMetricMessagesMeta: document.querySelector("#cloudMetricMessagesMeta"),
  cloudMetricPlan: document.querySelector("#cloudMetricPlan"),
  cloudMetricPlanMeta: document.querySelector("#cloudMetricPlanMeta"),
  cloudReadinessScore: document.querySelector("#cloudReadinessScore"),
  cloudReadiness: document.querySelector("#cloudReadiness"),
  cloudOperations: document.querySelector("#cloudOperations"),
  leadForm: document.querySelector("#leadForm"),
  leadBusiness: document.querySelector("#leadBusiness"),
  leadContact: document.querySelector("#leadContact"),
  leadType: document.querySelector("#leadType"),
  leadStatus: document.querySelector("#leadStatus"),
  leadNextAction: document.querySelector("#leadNextAction"),
  leadDueDate: document.querySelector("#leadDueDate"),
  leadNotes: document.querySelector("#leadNotes"),
  leadSearch: document.querySelector("#leadSearch"),
  leadFilter: document.querySelector("#leadFilter"),
  leadCount: document.querySelector("#leadCount"),
  leadList: document.querySelector("#leadList"),
  exportLeadsCsv: document.querySelector("#exportLeadsCsv"),
  importLeadsBtn: document.querySelector("#importLeadsBtn"),
  importLeadsFile: document.querySelector("#importLeadsFile"),
  downloadLeadsTemplate: document.querySelector("#downloadLeadsTemplate"),
  leadsDueToday: document.querySelector("#leadsDueToday"),
  weeklyLeadProgress: document.querySelector("#weeklyLeadProgress"),
  nextOutreachMilestone: document.querySelector("#nextOutreachMilestone"),
  metricTotalLeads: document.querySelector("#metricTotalLeads"),
  metricContacted: document.querySelector("#metricContacted"),
  metricDemos: document.querySelector("#metricDemos"),
  metricTrials: document.querySelector("#metricTrials"),
  metricWon: document.querySelector("#metricWon"),
  metricWinRate: document.querySelector("#metricWinRate"),
  logout: document.querySelector("#logout"),
  resetDemo: document.querySelector("#resetDemo")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(seedData);
  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return structuredClone(seedData);
  }
}

function normalizeState(value) {
  const clean = structuredClone(seedData);
  return {
    ...clean,
    ...value,
    session: { ...clean.session, ...(value.session || {}) },
    cloud: { ...clean.cloud, ...(value.cloud || {}) },
    business: { ...clean.business, ...(value.business || {}) },
    subscription: { ...clean.subscription, ...(value.subscription || {}) },
    staff: Array.isArray(value.staff) ? value.staff : clean.staff,
    customers: Array.isArray(value.customers) ? value.customers : clean.customers,
    items: Array.isArray(value.items) ? value.items : clean.items,
    sales: Array.isArray(value.sales) ? value.sales : clean.sales,
    payments: Array.isArray(value.payments) ? value.payments : clean.payments,
    expenses: Array.isArray(value.expenses) ? value.expenses : clean.expenses,
    quotes: Array.isArray(value.quotes) ? value.quotes : clean.quotes,
    leads: Array.isArray(value.leads) ? value.leads : clean.leads,
    recurringContracts: Array.isArray(value.recurringContracts) ? value.recurringContracts : clean.recurringContracts,
    reminders: Array.isArray(value.reminders) ? value.reminders : clean.reminders,
    notificationSettings: { ...clean.notificationSettings, ...(value.notificationSettings || {}) },
    quoteCounter: value.quoteCounter || clean.quoteCounter,
    receiptCounter: value.receiptCounter || clean.receiptCounter
  };
}

function freshCloudWorkspaceState() {
  const fresh = structuredClone(seedData);
  fresh.business = {
    isSetup: false,
    name: "Your Business",
    type: "Retail shop",
    phone: "",
    location: "",
    currency: "USD",
    payments: "Cash"
  };
  fresh.staff = [{ id: "u1", name: "Business Owner", role: "Owner" }];
  fresh.customers = [];
  fresh.items = [];
  fresh.sales = [];
  fresh.payments = [];
  fresh.expenses = [];
  fresh.quotes = [];
  fresh.leads = [];
  fresh.recurringContracts = [];
  fresh.reminders = [];
  fresh.quoteCounter = 2001;
  fresh.receiptCounter = 1001;
  return fresh;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (state.cloud?.enabled && window.LedgerCloud?.configured) {
    state.cloud.syncStatus = "syncing";
    window.LedgerCloud.pushState(state);
  }
}

function backupPayload() {
  return {
    app: "LedgerLite",
    version: "0.1",
    exportedAt: new Date().toISOString(),
    data: state
  };
}

function restoreStateFromBackup(value) {
  const rawData = value?.data || value;
  const restored = normalizeState(rawData);
  restored.session = { ...state.session, loggedIn: true };
  state = restored;
  selectedCustomerId = null;
  lastReceipt = null;
  lastQuote = null;
  saveState();
  renderAll();
  showView("dashboard");
}

function money(value, currency = "USD") {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayStamp(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function dateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function dueStatus(dueDate) {
  if (!dueDate) return { label: "No date set", className: "is-unscheduled", sort: 99 };
  const today = new Date(dateInputValue());
  const due = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(due.getTime())) return { label: "No date set", className: "is-unscheduled", sort: 99 };
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`, className: "is-overdue", sort: -10 + days };
  if (days === 0) return { label: "Due today", className: "is-due", sort: 0 };
  if (days === 1) return { label: "Due tomorrow", className: "is-soon", sort: 1 };
  return { label: `Due in ${days} days`, className: "is-later", sort: days };
}

function nextActionForStatus(status) {
  const actions = {
    "New lead": "Send opener",
    Contacted: "Book demo",
    "Demo booked": "Set up trial",
    "Trial setup": "Follow up payment",
    Won: "Collect testimonial",
    "Not now": "Check later"
  };
  return actions[status] || "Send opener";
}

function findCustomer(id) {
  return state.customers.find((customer) => customer.id === id);
}

function findItem(id) {
  return state.items.find((item) => item.id === id);
}

function includesSearch(values, query) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
}

function currentBusinessName() {
  return state.business?.name || "Your business";
}

function documentLines(document) {
  if (Array.isArray(document?.lines) && document.lines.length) return document.lines;
  const item = findItem(document?.itemId);
  const quantity = Number(document?.quantity || 1);
  const total = Number(document?.total || 0);
  return [{
    itemId: document?.itemId || "",
    name: item?.name || document?.manualItemName || "Item",
    quantity,
    unitPrice: quantity ? total / quantity : total,
    amount: total,
    isService: Boolean(item?.isService)
  }];
}

function lineText(lines, currency) {
  return lines.map((line) => `${line.name} x ${line.quantity} @ ${money(line.unitPrice, currency)} = ${money(line.amount, currency)}`);
}

function receiptDetails(sale = lastReceipt) {
  if (!sale) return null;
  const customer = findCustomer(sale.customerId);
  const lines = documentLines(sale);
  return {
    businessName: currentBusinessName(),
    phone: state.business.phone || "",
    location: state.business.location || "",
    receipt: sale.receipt,
    date: todayStamp(sale.createdAt),
    customerName: customer?.name || sale.manualCustomerName || "Walk-in",
    customerPhone: customer?.phone || "",
    lines,
    method: sale.method,
    total: money(sale.total, sale.currency),
    paid: money(sale.paid, sale.currency),
    balance: money(sale.balance, sale.currency),
    notes: sale.notes || "Thank you for your business."
  };
}

function receiptText(sale = lastReceipt) {
  const details = receiptDetails(sale);
  if (!details) return "";
  return [
    `${details.businessName}`,
    details.location ? `${details.location}` : "",
    details.phone ? `${details.phone}` : "",
    "",
    `Receipt: ${details.receipt}`,
    `Date: ${details.date}`,
    `Customer: ${details.customerName}`,
    "Items:",
    ...lineText(details.lines, sale.currency),
    `Payment: ${details.method}`,
    `Total: ${details.total}`,
    `Paid: ${details.paid}`,
    `Balance: ${details.balance}`,
    "",
    details.notes,
    "Powered by Danova Technologies"
  ].filter((line, index, list) => line !== "" || list[index - 1] !== "").join("\n");
}

function quoteDetails(quote = lastQuote) {
  if (!quote) return null;
  const customer = findCustomer(quote.customerId);
  const lines = documentLines(quote);
  const totalValue = Number(quote.total || 0);
  return {
    businessName: currentBusinessName(),
    phone: state.business.phone || "",
    location: state.business.location || "",
    businessMeta: [state.business.type, state.business.location, state.business.phone].filter(Boolean).join(" - "),
    quoteNumber: quote.quoteNumber,
    date: todayStamp(quote.createdAt),
    validUntil: todayStamp(quote.validUntil),
    customerName: customer?.name || quote.manualCustomerName || "Walk-in",
    customerPhone: customer?.phone || "",
    lines,
    currency: quote.currency,
    subtotal: money(totalValue, quote.currency),
    total: money(totalValue, quote.currency),
    notes: quote.notes || "Quote valid until the date shown above."
  };
}

function quoteText(quote = lastQuote) {
  const details = quoteDetails(quote);
  if (!details) return "";
  return [
    `${details.businessName}`,
    details.location ? `${details.location}` : "",
    details.phone ? `${details.phone}` : "",
    "",
    `Quote: ${details.quoteNumber}`,
    `Date: ${details.date}`,
    `Valid until: ${details.validUntil}`,
    `Customer: ${details.customerName}`,
    "Items:",
    ...lineText(details.lines, quote.currency),
    `Total: ${details.total}`,
    "",
    details.notes,
    "Powered by Danova Technologies"
  ].filter((line, index, list) => line !== "" || list[index - 1] !== "").join("\n");
}

function whatsappUrl(phone, text) {
  const cleanPhone = (phone || "").replace(/[^\d]/g, "");
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function balanceReminderText(customer) {
  return `Hello ${customer.name}, this is a friendly reminder from ${currentBusinessName()}. Your current balance is ${money(customer.balance, state.business.currency)}. Please make payment when possible. Thank you.`;
}

function customerStatementDetails(customer) {
  if (!customer) return null;
  const sales = state.sales.filter((sale) => sale.customerId === customer.id);
  const payments = state.payments.filter((payment) => payment.customerId === customer.id);
  const events = [
    ...sales.map((sale) => ({
      createdAt: sale.createdAt,
      type: "Sale",
      reference: sale.receipt,
      detail: lineText(documentLines(sale), sale.currency).join("; "),
      debit: Number(sale.total || 0),
      credit: Number(sale.paid || 0)
    })),
    ...payments.map((payment) => ({
      createdAt: payment.createdAt,
      type: "Payment",
      reference: payment.method,
      detail: payment.note || "Payment received",
      debit: 0,
      credit: Number(payment.amount || 0)
    }))
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let runningBalance = 0;
  const rows = events.map((event) => {
    runningBalance += event.debit - event.credit;
    return { ...event, balance: runningBalance };
  });
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) + payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    businessName: currentBusinessName(),
    businessMeta: [state.business.type, state.business.location, state.business.phone].filter(Boolean).join(" - "),
    customerName: customer.name,
    customerPhone: customer.phone || "",
    date: todayStamp(new Date().toISOString()),
    currency: state.business.currency || "USD",
    totalSales,
    totalPaid,
    balance: Number(customer.balance || 0),
    rows
  };
}

function customerStatementText(customer) {
  const details = customerStatementDetails(customer);
  if (!details) return "";
  return [
    `${details.businessName}`,
    details.businessMeta,
    "",
    `Customer statement: ${details.customerName}`,
    details.customerPhone ? `Phone: ${details.customerPhone}` : "",
    `Date: ${details.date}`,
    "",
    `Total sales: ${money(details.totalSales, details.currency)}`,
    `Total paid: ${money(details.totalPaid, details.currency)}`,
    `Balance due: ${money(details.balance, details.currency)}`,
    "",
    "Activity:",
    ...(details.rows.length
      ? details.rows.map((row) => `${todayStamp(row.createdAt)} - ${row.type} ${row.reference}: ${row.detail} | Debit ${money(row.debit, details.currency)} | Credit ${money(row.credit, details.currency)} | Balance ${money(row.balance, details.currency)}`)
      : ["No transactions recorded yet."]),
    "",
    "Powered by Danova Technologies"
  ].filter((line, index, list) => line !== "" || list[index - 1] !== "").join("\n");
}

function quoteReminderText(quote) {
  const customer = findCustomer(quote.customerId);
  const lines = documentLines(quote);
  const description = lines.length === 1 ? lines[0].name : `${lines.length} items/services`;
  return `Hello ${customer?.name || quote.manualCustomerName || "there"}, this is a follow-up from ${currentBusinessName()} about quote ${quote.quoteNumber} for ${description} totaling ${money(quote.total, quote.currency)}. The quote is valid until ${todayStamp(quote.validUntil)}. Please let us know if you would like to proceed.`;
}

function outreachScriptText(key) {
  const scripts = {
    retail:
      "Hello, I am building LedgerLite, a simple business app for Zimbabwean shops that still use cash and manual books. It helps track sales, customer balances, stock, receipts, and daily cash-up. Can I show you a quick 10-minute demo and set up a sample for your shop?",
    service:
      "Hello, I am working on LedgerLite, a simple tool for salons, barbers, tutors, clinics, and service businesses to record payments, balances, receipts, and WhatsApp follow-ups. Would you be open to a short demo this week?",
    afterDemo:
      "Thank you for looking at LedgerLite today. Based on what you showed me, the first setup I recommend is customers, common items/services, receipts, and balance follow-ups. I can help you test it for a few days and adjust it to your workflow."
  };
  return scripts[key] || "";
}

function getBusinessPreset() {
  return businessPresets[state.business.type] || businessPresets["Other service business"];
}

function addPresetItems() {
  const preset = getBusinessPreset();
  let added = 0;
  preset.items.forEach((presetItem) => {
    const exists = state.items.some((item) => item.name.toLowerCase() === presetItem.name.toLowerCase());
    if (!exists) {
      state.items.push({
        id: createId("i"),
        name: presetItem.name,
        price: presetItem.price,
        stock: presetItem.stock,
        isService: Boolean(presetItem.isService)
      });
      added += 1;
    }
  });
  saveState();
  renderAll();
  alert(added ? `Loaded ${added} starter items/services.` : "Starter setup is already loaded.");
}

function typedBusinessType(selectEl, otherEl) {
  const typed = otherEl.value.trim();
  return selectEl.value === "Other" && typed ? typed : selectEl.value;
}

function toggleOtherBusinessType(selectEl, wrapperEl) {
  wrapperEl.classList.toggle("hidden", selectEl.value !== "Other");
}

function renderAccessState() {
  els.authScreen.classList.toggle("hidden", Boolean(state.session.loggedIn));
  els.setupModal.classList.toggle("hidden", !state.session.loggedIn || Boolean(state.business.isSetup));
  const cloudActive = Boolean(state.cloud?.enabled && window.LedgerCloud?.configured);
  els.cloudSyncStatus.textContent = cloudActive
    ? state.cloud.syncStatus === "syncing" ? "Cloud syncing" : state.cloud.syncStatus === "conflict" ? "Cloud changes detected" : state.cloud.syncStatus === "error" ? "Cloud sync needs attention" : "Cloud protected"
    : "Local device";
  els.cloudSyncStatus.classList.toggle("ready", cloudActive && !["error", "conflict"].includes(state.cloud.syncStatus));
  els.cloudConflictBanner.classList.toggle("hidden", state.cloud.syncStatus !== "conflict");
  els.cloudSecurityStatus.textContent = cloudActive ? "Cloud protected" : "Local mode";
  els.cloudExportData.disabled = !cloudActive;
  els.requestWorkspaceDeletion.disabled = !cloudActive;
  if (state.session.loggedIn && !state.business.isSetup) renderSetupWizard();
}

function setupPaymentMethods() {
  return els.setupPaymentOptions.filter((option) => option.checked).map((option) => option.value);
}

function renderSetupWizard() {
  els.setupSteps.forEach((step) => step.classList.toggle("active", Number(step.dataset.setupStep) === setupStep));
  els.setupProgress.forEach((marker, index) => marker.classList.toggle("active", index < setupStep));
  els.setupStepLabel.textContent = `Step ${setupStep} of 4`;
  els.setupBack.classList.toggle("hidden", setupStep === 1);
  els.setupNext.classList.toggle("hidden", setupStep === 4);
  els.setupSubmit.classList.toggle("hidden", setupStep !== 4);
  if (setupStep === 4) {
    const type = typedBusinessType(els.setupBusinessType, els.setupBusinessTypeOther);
    const payments = setupPaymentMethods();
    const startMode = els.setupStartModes.find((option) => option.checked)?.value || "blank";
    els.setupReview.innerHTML = `
      <article><span>Business</span><strong>${escapeHtml(els.setupBusinessName.value.trim() || "Not entered")}</strong></article>
      <article><span>Type</span><strong>${escapeHtml(type)}</strong></article>
      <article><span>Location</span><strong>${escapeHtml(els.setupBusinessLocation.value.trim() || "Not entered")}</strong></article>
      <article><span>Currency</span><strong>${escapeHtml(els.setupBusinessCurrency.value)}</strong></article>
      <article><span>Payments</span><strong>${escapeHtml(payments.join(", ") || "None selected")}</strong></article>
      <article><span>Starting data</span><strong>${startMode === "starter" ? "Starter catalogue" : "Blank workspace"}</strong></article>
    `;
  }
}

function validateSetupStep() {
  const activeStep = els.setupSteps.find((step) => Number(step.dataset.setupStep) === setupStep);
  const fields = [...activeStep.querySelectorAll("input, select")].filter((field) => !field.disabled);
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  if (setupStep === 2 && !setupPaymentMethods().length) {
    alert("Choose at least one accepted payment method.");
    return false;
  }
  return true;
}

function showView(viewId) {
  els.views.forEach((view) => view.classList.toggle("active-view", view.id === viewId));
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  const activeLabel = els.navItems.find((item) => item.dataset.view === viewId)?.textContent || "Dashboard";
  els.viewTitle.textContent = activeLabel;
}

function renderBusinessProfile() {
  const business = state.business;
  const preset = getBusinessPreset();
  els.activeBusinessName.textContent = business.isSetup ? business.name : "Business setup needed";
  els.activeBusinessMeta.textContent = business.isSetup
    ? `${business.type} - ${business.location} - ${business.currency}`
    : "Add details in settings";
  els.businessName.value = business.name || "";
  const knownTypes = [...els.businessType.options].map((option) => option.value);
  els.businessType.value = knownTypes.includes(business.type) ? business.type : "Other";
  els.businessTypeOther.value = knownTypes.includes(business.type) ? "" : business.type;
  toggleOtherBusinessType(els.businessType, els.businessTypeOtherWrap);
  els.businessPhone.value = business.phone || "";
  els.businessLocation.value = business.location || "";
  els.businessCurrency.value = business.currency || "USD";
  const paymentText = business.payments || "Cash, EcoCash, Innbucks, Bank Transfer";
  const normalizedPayments = paymentText.toLowerCase().includes("innbucks") ? paymentText : `${paymentText}, Innbucks`;
  els.businessPayments.value = normalizedPayments;
  els.saleCurrency.value = business.currency || "USD";
  const methods = normalizedPayments
    .split(",")
    .map((method) => method.trim())
    .filter(Boolean);
  els.paymentMethod.innerHTML = methods.map((method) => `<option>${method}</option>`).join("");
  els.paymentMethodCollect.innerHTML = methods.map((method) => `<option>${method}</option>`).join("");
  els.expenseMethod.innerHTML = methods.map((method) => `<option>${method}</option>`).join("");
  els.paymentCurrency.value = business.currency || "USD";
  els.expenseCurrency.value = business.currency || "USD";

  els.saleCustomerLabel.textContent = preset.customerLabel;
  els.saleItemLabel.textContent = preset.itemLabel;
  els.itemNameLabel.textContent = preset.itemNameLabel;
  els.businessKitTitle.textContent = preset.title;
  els.businessKitCopy.textContent = `Optimized for ${business.type.toLowerCase()} workflows while still supporting cash, mobile money, balances, receipts, expenses, and reports.`;
  els.businessKitList.innerHTML = preset.kit.map((item) => `<span class="kit-chip">${item}</span>`).join("");
  els.settingsPresetTitle.textContent = preset.title;
  els.settingsPresetCopy.textContent = `Load starter ${preset.itemLabel.toLowerCase()} entries for this business type.`;
}

function renderStaff() {
  els.staffCount.textContent = `${state.staff.length} staff`;
  els.staffList.innerHTML = state.staff
    .map(
      (member) => `
        <div class="list-item">
          <div class="list-row">
            <strong>${member.name}</strong>
            <span class="pill">${member.role}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  return new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
}

function nextMonthlyDueDate(billingDay) {
  const today = dateFromKey(localDateKey());
  let due = new Date(today.getFullYear(), today.getMonth(), Number(billingDay), 12);
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, Number(billingDay), 12);
  return due;
}

function reminderStatus(reminder) {
  if (reminder.paidAt) return "paid";
  if (reminder.sentAt) return "sent";
  return dateFromKey(reminder.reminderDate) <= dateFromKey(localDateKey()) ? "ready" : "upcoming";
}

function prepareRecurringReminders() {
  let changed = false;
  state.recurringContracts.filter((contract) => contract.status === "active").forEach((contract) => {
    const due = nextMonthlyDueDate(contract.billingDay);
    const dueDate = localDateKey(due);
    const exists = state.reminders.some((reminder) => reminder.contractId === contract.id && reminder.dueDate === dueDate);
    if (exists) return;
    const reminderDate = new Date(due);
    reminderDate.setDate(reminderDate.getDate() - Number(contract.leadDays || 3));
    state.reminders.push({
      id: createId("rm"),
      contractId: contract.id,
      customerId: contract.customerId,
      dueDate,
      reminderDate: localDateKey(reminderDate),
      createdAt: new Date().toISOString(),
      openedAt: "",
      sentAt: "",
      paidAt: ""
    });
    changed = true;
  });
  if (changed) saveState();
}

function recurringReminderText(reminder) {
  const contract = state.recurringContracts.find((entry) => entry.id === reminder.contractId);
  const customer = findCustomer(reminder.customerId);
  if (!contract || !customer) return "";
  const today = dateFromKey(localDateKey());
  const due = dateFromKey(reminder.dueDate);
  const days = Math.max(0, Math.round((due - today) / 86400000));
  const timing = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  const methods = state.business.payments || "your usual payment method";
  return `Hello ${customer.name}, this is a friendly reminder from ${currentBusinessName()}. Your ${contract.service} payment of ${money(contract.amount, contract.currency)} is due ${timing}, on ${todayStamp(reminder.dueDate)}. You may pay via ${methods}. Please disregard this message if you have already paid. Thank you.`;
}

function renderRecurringBilling() {
  prepareRecurringReminders();
  const activeContracts = state.recurringContracts.filter((contract) => contract.status === "active");
  const readyReminders = state.reminders.filter((reminder) => reminderStatus(reminder) === "ready");
  const monthKey = localDateKey().slice(0, 7);
  const sentThisMonth = state.reminders.filter((reminder) => reminder.sentAt?.slice(0, 7) === monthKey);
  const totals = {};
  activeContracts.forEach((contract) => addCurrencyTotal(totals, contract.currency, contract.amount));

  els.recurringCustomer.innerHTML = state.customers.length
    ? state.customers.map((customer) => `<option value="${customer.id}">${escapeHtml(customer.name)} - ${escapeHtml(customer.phone || "No phone")}</option>`).join("")
    : '<option value="">Add a customer first</option>';
  els.recurringCustomer.disabled = !state.customers.length;
  els.recurringCurrency.value = state.business.currency || "USD";
  if (!els.recurringBillingDay.options.length) {
    els.recurringBillingDay.innerHTML = Array.from({ length: 28 }, (_, index) => `<option value="${index + 1}">Day ${index + 1}</option>`).join("");
    els.recurringBillingDay.value = String(Math.min(new Date().getDate() + 3, 28));
  }

  els.recurringActiveCount.textContent = String(activeContracts.length);
  els.recurringMonthlyValue.textContent = formatCurrencyTotals(totals);
  els.remindersReadyCount.textContent = String(readyReminders.length);
  els.remindersSentCount.textContent = String(sentThisMonth.length);
  els.recurringContractCount.textContent = `${activeContracts.length} active`;
  els.recurringContractList.innerHTML = state.recurringContracts.length
    ? state.recurringContracts.map((contract) => {
        const customer = findCustomer(contract.customerId);
        const isActive = contract.status === "active";
        return `<article class="recurring-contract ${isActive ? "" : "paused"}">
          <div class="list-row"><strong>${escapeHtml(contract.service)}</strong><span class="${isActive ? "paid" : "pill"}">${isActive ? "Active" : "Paused"}</span></div>
          <p>${escapeHtml(customer?.name || "Customer")} · ${money(contract.amount, contract.currency)} monthly</p>
          <small>Due on day ${contract.billingDay} · reminder ${contract.leadDays} days before</small>
          <button class="ghost" data-toggle-contract="${contract.id}" type="button">${isActive ? "Pause" : "Resume"}</button>
        </article>`;
      }).join("")
    : '<div class="empty-state compact-empty">No monthly agreements yet.</div>';

  const filter = els.reminderFilter.value;
  const filtered = state.reminders
    .filter((reminder) => filter === "all" || reminderStatus(reminder) === filter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  els.reminderQueue.innerHTML = filtered.length
    ? filtered.map((reminder) => {
        const contract = state.recurringContracts.find((entry) => entry.id === reminder.contractId);
        const customer = findCustomer(reminder.customerId);
        const status = reminderStatus(reminder);
        const canSend = status === "ready";
        return `<article class="reminder-card status-${status}">
          <div class="reminder-card-head">
            <div><span class="reminder-status">${status === "ready" ? "Ready to send" : status}</span><h3>${escapeHtml(customer?.name || "Customer")}</h3></div>
            <strong>${money(contract?.amount, contract?.currency)}</strong>
          </div>
          <p>${escapeHtml(contract?.service || "Monthly service")} · due ${todayStamp(reminder.dueDate)}</p>
          <div class="reminder-preview">${escapeHtml(recurringReminderText(reminder))}</div>
          <div class="reminder-actions">
            <button class="ghost" data-copy-recurring="${reminder.id}" type="button">Copy</button>
            ${canSend ? `<button class="primary" data-open-recurring="${reminder.id}" type="button">Open WhatsApp</button><button class="ghost" data-mark-sent="${reminder.id}" type="button">Mark sent</button>` : ""}
            ${status !== "paid" ? `<button class="ghost" data-mark-paid="${reminder.id}" type="button">Mark paid</button>` : ""}
          </div>
        </article>`;
      }).join("")
    : `<div class="empty-state compact-empty">No ${filter === "all" ? "" : `${filter} `}reminders.</div>`;

  document.querySelectorAll("[data-toggle-contract]").forEach((button) => button.addEventListener("click", () => {
    const contract = state.recurringContracts.find((entry) => entry.id === button.dataset.toggleContract);
    if (!contract) return;
    contract.status = contract.status === "active" ? "paused" : "active";
    saveState();
    renderRecurringBilling();
  }));
  document.querySelectorAll("[data-copy-recurring]").forEach((button) => button.addEventListener("click", async () => {
    const reminder = state.reminders.find((entry) => entry.id === button.dataset.copyRecurring);
    await copyText(recurringReminderText(reminder));
    alert("Reminder copied.");
  }));
  document.querySelectorAll("[data-open-recurring]").forEach((button) => button.addEventListener("click", () => {
    const reminder = state.reminders.find((entry) => entry.id === button.dataset.openRecurring);
    const customer = findCustomer(reminder?.customerId);
    reminder.openedAt = new Date().toISOString();
    saveState();
    window.open(whatsappUrl(customer?.phone, recurringReminderText(reminder)), "_blank", "noopener");
  }));
  document.querySelectorAll("[data-mark-sent]").forEach((button) => button.addEventListener("click", () => {
    const reminder = state.reminders.find((entry) => entry.id === button.dataset.markSent);
    reminder.sentAt = new Date().toISOString();
    saveState();
    renderRecurringBilling();
  }));
  document.querySelectorAll("[data-mark-paid]").forEach((button) => button.addEventListener("click", () => {
    const reminder = state.reminders.find((entry) => entry.id === button.dataset.markPaid);
    reminder.paidAt = new Date().toISOString();
    saveState();
    renderRecurringBilling();
  }));
}

function businessNotifications() {
  const today = localDateKey();
  const alerts = [];

  state.reminders.forEach((reminder) => {
    const status = reminderStatus(reminder);
    const overdue = reminder.dueDate < today;
    if (status === "paid" || status === "upcoming" || (status === "sent" && !overdue)) return;
    const contract = state.recurringContracts.find((entry) => entry.id === reminder.contractId);
    const customer = findCustomer(reminder.customerId);
    alerts.push({
      id: `reminder-${reminder.id}-${status}`,
      severity: overdue ? "urgent" : "action",
      title: overdue ? `${customer?.name || "Customer"} payment is overdue` : `Reminder ready for ${customer?.name || "customer"}`,
      body: `${contract?.service || "Monthly service"} · ${money(contract?.amount, contract?.currency)} · due ${todayStamp(reminder.dueDate)}`,
      view: "recurring",
      action: overdue ? "Review payment" : "Send reminder"
    });
  });

  state.customers.filter((customer) => Number(customer.balance || 0) > 0).forEach((customer) => {
    alerts.push({
      id: `balance-${customer.id}-${Number(customer.balance).toFixed(2)}`,
      severity: Number(customer.balance) >= 50 ? "urgent" : "action",
      title: `${customer.name} has an unpaid balance`,
      body: `${money(customer.balance, state.business.currency)} remains outstanding.`,
      view: "followups",
      action: "Follow up"
    });
  });

  state.items.filter((item) => !item.isService && Number(item.stock || 0) <= 10).forEach((item) => {
    alerts.push({
      id: `stock-${item.id}-${item.stock}`,
      severity: Number(item.stock || 0) <= 3 ? "urgent" : "review",
      title: `${item.name} is running low`,
      body: `${item.stock} unit${Number(item.stock) === 1 ? "" : "s"} remaining.`,
      view: "inventory",
      action: "Review stock"
    });
  });

  state.quotes.filter((quote) => quote.status !== "converted").forEach((quote) => {
    const days = Math.round((dateFromKey(quote.validUntil) - dateFromKey(today)) / 86400000);
    if (days < 0 || days > 3) return;
    const customer = findCustomer(quote.customerId);
    alerts.push({
      id: `quote-${quote.id}-${quote.validUntil}`,
      severity: days <= 1 ? "action" : "review",
      title: `${quote.quoteNumber} expires ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`,
      body: `${customer?.name || quote.manualCustomerName || "Customer"} · ${money(quote.total, quote.currency)}`,
      view: "quotes",
      action: "Open quote"
    });
  });

  const rank = { urgent: 0, action: 1, review: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function renderBusinessNotifications() {
  const alerts = businessNotifications();
  const reviewedIds = new Set(Array.isArray(state.notificationSettings.reviewedAlertIds) ? state.notificationSettings.reviewedAlertIds : []);
  const unseen = alerts.filter((alert) => !reviewedIds.has(alert.id));
  const filter = els.notificationFilter.value;
  const filtered = alerts.filter((alert) => filter === "all" || alert.severity === filter);

  els.businessAlertCount.textContent = unseen.length > 99 ? "99+" : String(unseen.length);
  els.businessAlertButton.classList.toggle("has-alerts", unseen.length > 0);
  els.urgentNotificationCount.textContent = String(alerts.filter((alert) => alert.severity === "urgent").length);
  els.actionNotificationCount.textContent = String(alerts.filter((alert) => alert.severity === "action").length);
  els.reviewNotificationCount.textContent = String(alerts.filter((alert) => alert.severity === "review").length);
  const supported = "Notification" in window;
  const permission = supported ? Notification.permission : "unsupported";
  els.deviceNotificationStatus.textContent = permission === "granted" && state.notificationSettings.deviceEnabled ? "On" : permission === "denied" ? "Blocked" : "Off";
  els.enableBrowserNotifications.disabled = !supported || permission === "denied";
  els.enableBrowserNotifications.textContent = !supported
    ? "Device notifications unavailable"
    : permission === "denied"
      ? "Notifications blocked in browser"
      : permission === "granted" && state.notificationSettings.deviceEnabled
        ? "Device notifications enabled"
        : "Enable device notifications";

  els.notificationList.innerHTML = filtered.length
    ? filtered.map((alert) => `<article class="business-alert alert-${alert.severity} ${reviewedIds.has(alert.id) ? "reviewed" : ""}">
        <div class="alert-priority"><span>${alert.severity === "action" ? "Action needed" : alert.severity}</span></div>
        <div class="alert-content"><h3>${escapeHtml(alert.title)}</h3><p>${escapeHtml(alert.body)}</p></div>
        <button class="ghost" data-alert-view="${alert.view}" type="button">${alert.action}</button>
      </article>`).join("")
    : '<div class="empty-state compact-empty">Nothing needs attention in this category.</div>';

  document.querySelectorAll("[data-alert-view]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.alertView)));
}

async function notifyBusinessForReadyReminders() {
  if (!state.notificationSettings.deviceEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
  const pending = state.reminders.filter((reminder) => {
    const status = reminderStatus(reminder);
    return (status === "ready" || (status === "sent" && reminder.dueDate < localDateKey())) && !reminder.businessNotifiedAt;
  });
  if (!pending.length) return;

  for (const reminder of pending) {
    const contract = state.recurringContracts.find((entry) => entry.id === reminder.contractId);
    const customer = findCustomer(reminder.customerId);
    const options = {
      body: `${customer?.name || "Customer"}: ${money(contract?.amount, contract?.currency)} for ${contract?.service || "monthly service"} is due ${todayStamp(reminder.dueDate)}.`,
      tag: `ledgerlite-${reminder.id}`,
      renotify: false
    };
    try {
      if (navigator.serviceWorker?.ready) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("LedgerLite payment reminder", options);
      } else {
        new Notification("LedgerLite payment reminder", options);
      }
      reminder.businessNotifiedAt = new Date().toISOString();
    } catch {
      return;
    }
  }
  saveState();
}

const subscriptionPlans = {
  Starter: {
    monthly: 5,
    annual: 50,
    description: "For an owner getting organised.",
    users: 1,
    records: 500,
    features: ["Sales and receipts", "Customers and balances", "Inventory and expenses", "Local backup"]
  },
  Business: {
    monthly: 10,
    annual: 100,
    description: "For a growing team running daily operations.",
    users: 5,
    records: 5000,
    featured: true,
    features: ["Everything in Starter", "Quotes and follow-ups", "Advanced reports", "Priority support"]
  },
  Pro: {
    monthly: 20,
    annual: 200,
    description: "For established and multi-branch businesses.",
    users: 15,
    records: 25000,
    features: ["Everything in Business", "Multi-branch ready", "Team permissions", "Data migration support"]
  }
};

function subscriptionDateLabel(value) {
  if (!value) return "To be confirmed";
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function trialEndDate() {
  const date = new Date(state.subscription.trialStartedAt || Date.now());
  date.setDate(date.getDate() + 14);
  return date;
}

function renderBilling() {
  const subscription = state.subscription;
  const plan = subscriptionPlans[subscription.plan] || subscriptionPlans.Starter;
  const isTrial = subscription.status === "trial";
  const isPending = subscription.status === "pending";
  const recordCount = state.sales.length + state.payments.length + state.expenses.length + state.quotes.length;
  const statusLabels = { trial: "Trial active", active: "Active", pending: "Activation pending", past_due: "Payment due" };

  els.currentPlanName.textContent = `${subscription.plan}${isTrial ? " trial" : ""}`;
  els.subscriptionStatus.textContent = statusLabels[subscription.status] || "Plan status";
  els.subscriptionStatus.className = `status-chip status-${subscription.status}`;
  els.planStatusCopy.textContent = isTrial
    ? "Explore the complete workspace during your 14-day trial."
    : isPending
      ? "Danova Technologies is reviewing your activation request."
      : "Your workspace subscription is active.";
  els.planDateLabel.textContent = isTrial ? "Trial ends" : "Next renewal";
  els.planRenewalDate.textContent = subscriptionDateLabel(isTrial ? (subscription.trialEndsAt || trialEndDate()) : subscription.renewalDate);
  els.pendingPlanNotice.classList.toggle("hidden", !subscription.pendingPlan);
  els.pendingPlanNotice.textContent = subscription.pendingPlan
    ? `${subscription.pendingPlan} plan requested via ${subscription.paymentMethod}. We will confirm before activation.`
    : "";
  els.usagePlanLabel.textContent = `${subscription.plan} limits`;

  const usage = [
    { label: "Team members", value: state.staff.length, limit: plan.users },
    { label: "Business records", value: recordCount, limit: plan.records },
    { label: "Customers", value: state.customers.length, limit: plan.records }
  ];
  els.workspaceUsage.innerHTML = usage.map((item) => {
    const percent = Math.min(100, Math.round((item.value / item.limit) * 100));
    return `<div class="usage-row">
      <div><span>${item.label}</span><strong>${item.value.toLocaleString()} / ${item.limit.toLocaleString()}</strong></div>
      <div class="usage-track"><span style="width:${percent}%"></span></div>
    </div>`;
  }).join("");

  els.billingCycleButtons.forEach((button) => button.classList.toggle("active", button.dataset.billingCycle === subscription.cycle));
  els.pricingPlans.innerHTML = Object.entries(subscriptionPlans).map(([name, option]) => {
    const price = option[subscription.cycle];
    const suffix = subscription.cycle === "annual" ? "/year" : "/month";
    const selected = subscription.pendingPlan === name || (!subscription.pendingPlan && subscription.plan === name);
    return `<article class="pricing-card ${option.featured ? "featured" : ""} ${selected ? "selected" : ""}">
      ${option.featured ? '<span class="recommended-label">Most popular</span>' : ""}
      <div><h3>${name}</h3><p>${option.description}</p></div>
      <div class="plan-price"><strong>US$${price}</strong><span>${suffix}</span></div>
      <ul>${option.features.map((feature) => `<li>${feature}</li>`).join("")}</ul>
      <button class="${selected ? "ghost" : "primary"}" data-select-plan="${name}" type="button">${selected ? "Selected" : `Choose ${name}`}</button>
    </article>`;
  }).join("");
  els.billingPaymentMethod.value = subscription.paymentMethod || "EcoCash USD";
  els.billingContact.value = subscription.billingContact || state.business.phone || "";

  document.querySelectorAll("[data-select-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      state.subscription.pendingPlan = button.dataset.selectPlan;
      saveState();
      renderBilling();
    });
  });
}

function renderCloudHealth() {
  const connected = Boolean(state.cloud?.enabled && window.LedgerCloud?.configured);
  const health = cloudHealth;
  const messages = health?.messages || [];
  const pendingMessages = messages.filter((message) => ["queued", "processing", "failed", "awaiting_provider"].includes(message.status));
  const deliveredMessages = messages.filter((message) => message.status === "delivered");
  const subscription = health?.subscription;

  els.refreshCloudHealth.disabled = !connected || cloudHealthLoading;
  els.refreshCloudHealth.textContent = cloudHealthLoading ? "Refreshing..." : "Refresh status";
  els.cloudHealthUpdated.textContent = health?.checkedAt
    ? `Checked ${new Date(health.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : connected ? "Ready to check live services" : "Sign in to a cloud workspace";
  els.cloudMetricSync.textContent = connected ? state.cloud.syncStatus === "error" ? "Attention" : "Protected" : "Local";
  els.cloudMetricSyncMeta.textContent = health?.snapshot ? `Snapshot version ${health.snapshot.version}` : connected ? "Waiting for first sync" : "Not connected";
  els.cloudMetricTeam.textContent = `${health?.members?.length || 0} user${health?.members?.length === 1 ? "" : "s"}`;
  els.cloudMetricTeamMeta.textContent = health?.members?.length ? health.members.map((member) => member.role).join(", ") : "Workspace members";
  els.cloudMetricMessages.textContent = `${pendingMessages.length} pending`;
  els.cloudMetricMessagesMeta.textContent = `${deliveredMessages.length} delivered recently`;
  els.cloudMetricPlan.textContent = subscription?.plan || state.subscription.plan;
  els.cloudMetricPlanMeta.textContent = subscription ? `${subscription.status} · ${subscription.cycle}` : "Local plan preview";

  const checks = [
    { title: "Secure account", detail: connected ? "Authenticated cloud session is active." : "Cloud sign-in is required.", ready: connected },
    { title: "Workspace isolation", detail: health?.workspace?.status === "active" ? "Workspace is active and protected by RLS." : "Workspace status has not been verified.", ready: health?.workspace?.status === "active" },
    { title: "Cloud backup", detail: health?.snapshot ? `Version ${health.snapshot.version} saved ${todayStamp(health.snapshot.updated_at)}.` : "The first cloud snapshot is still pending.", ready: Boolean(health?.snapshot) },
    { title: "Subscription", detail: subscription ? `${subscription.plan} plan is ${subscription.status}.` : "Subscription record has not been loaded.", ready: ["trial", "active"].includes(subscription?.status) },
    { title: "Messaging queue", detail: messages.some((message) => message.status === "failed") ? "A failed delivery needs attention." : "No failed customer deliveries detected.", ready: !messages.some((message) => message.status === "failed") }
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  els.cloudReadinessScore.textContent = `${readyCount}/${checks.length} ready`;
  els.cloudReadiness.innerHTML = checks.map((check) => `<article class="cloud-readiness-item ${check.ready ? "ready" : "pending"}">
    <span>${check.ready ? "Ready" : "Pending"}</span><div><strong>${check.title}</strong><p>${check.detail}</p></div>
  </article>`).join("");

  const operations = [
    ...(health?.notifications || []).map((entry) => ({ title: entry.title, meta: `${entry.severity} notification`, at: entry.created_at })),
    ...(health?.audit || []).map((entry) => ({ title: entry.action.replaceAll(".", " "), meta: entry.entity_type, at: entry.created_at })),
    ...messages.filter((entry) => entry.last_error).map((entry) => ({ title: "Message delivery needs attention", meta: entry.last_error, at: entry.scheduled_for }))
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);
  els.cloudOperations.innerHTML = operations.length
    ? operations.map((operation) => `<article><div><strong>${escapeHtml(operation.title)}</strong><span>${escapeHtml(operation.meta)}</span></div><time>${todayStamp(operation.at)}</time></article>`).join("")
    : '<div class="empty-state compact-empty">Cloud operations will appear after the first synchronized change.</div>';
}

async function refreshCloudHealth() {
  if (!state.cloud?.enabled || !window.LedgerCloud?.configured || cloudHealthLoading) return;
  cloudHealthLoading = true;
  renderCloudHealth();
  try {
    cloudHealth = await window.LedgerCloud.getCloudHealth();
  } catch (error) {
    state.cloud.syncStatus = "error";
    state.cloud.error = error.message;
  } finally {
    cloudHealthLoading = false;
    renderCloudHealth();
    renderAccessState();
  }
}

function renderOnboardingChecklist() {
  const steps = [
    {
      title: "Business profile",
      body: "Confirm name, type, currency, and payment methods.",
      done: Boolean(state.business.isSetup),
      view: "settings"
    },
    {
      title: "Starter setup",
      body: "Load products, services, fees, rent, or produce for this business.",
      done: state.items.length > 4,
      action: addPresetItems
    },
    {
      title: "Customers",
      body: "Add or import customers, clients, tenants, members, or buyers.",
      done: state.customers.length > 3,
      view: "customers"
    },
    {
      title: "First sale",
      body: "Record income and create a professional receipt.",
      done: state.sales.length > 2,
      view: "sale"
    },
    {
      title: "Payments",
      body: "Receive money against outstanding balances.",
      done: state.payments.length > 0 || state.customers.every((customer) => Number(customer.balance || 0) === 0),
      view: "payments"
    },
    {
      title: "Reports",
      body: "Review sales, expenses, debtors, and low stock.",
      done: state.sales.length > 0 && state.expenses.length > 0,
      view: "reports"
    }
  ];
  const completed = steps.filter((step) => step.done).length;
  els.onboardingProgress.textContent = `${completed}/${steps.length} complete`;
  els.onboardingChecklist.innerHTML = steps
    .map(
      (step, index) => `
        <button class="check-item ${step.done ? "done" : ""}" type="button" data-step-index="${index}">
          <span class="check-mark">${step.done ? "OK" : index + 1}</span>
          <strong>${step.title}</strong>
          <span>${step.body}</span>
        </button>
      `
    )
    .join("");
  document.querySelectorAll(".check-item").forEach((button) => {
    button.addEventListener("click", () => {
      const step = steps[Number(button.dataset.stepIndex)];
      if (step.action) {
        step.action();
      } else if (step.view) {
        showView(step.view);
      }
    });
  });
}

function renderSmartInsights() {
  const today = new Date().toDateString();
  const now = new Date();
  const todaySales = state.sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  const todayPayments = state.payments.filter((payment) => new Date(payment.createdAt).toDateString() === today);
  const todayExpenses = state.expenses.filter((expense) => new Date(expense.createdAt).toDateString() === today);
  const todayReceived =
    todaySales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) +
    todayPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const expenseToday = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const netToday = todayReceived - expenseToday;
  const outstanding = state.customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0);
  const debtors = state.customers
    .filter((customer) => Number(customer.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  const lowStock = state.items.filter((item) => !item.isService && Number(item.stock || 0) <= 5);
  const openQuotes = state.quotes.filter((quote) => quote.status !== "Converted");
  const monthRevenue = state.sales
    .filter((sale) => {
      const date = new Date(sale.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const insights = [];

  if (debtors.length) {
    insights.push({
      tone: Number(debtors[0].balance || 0) >= 30 ? "danger" : "warning",
      label: "Collections",
      title: `${debtors[0].name} owes ${money(debtors[0].balance)}`,
      copy: `${debtors.length} account${debtors.length === 1 ? "" : "s"} have unpaid balances totaling ${money(outstanding)}.`,
      action: "followups",
      button: "Open follow-ups"
    });
  }

  if (lowStock.length) {
    insights.push({
      tone: lowStock.length >= 3 ? "danger" : "warning",
      label: "Inventory",
      title: `${lowStock.length} low-stock item${lowStock.length === 1 ? "" : "s"}`,
      copy: `${lowStock[0].name} is at ${Number(lowStock[0].stock || 0)} left. Restock before sales are missed.`,
      action: "inventory",
      button: "Check stock"
    });
  }

  if (openQuotes.length) {
    insights.push({
      tone: "info",
      label: "Quotes",
      title: `${openQuotes.length} open quote${openQuotes.length === 1 ? "" : "s"}`,
      copy: "Follow up quotes and convert accepted ones into sales.",
      action: "followups",
      button: "Open follow-ups"
    });
  }

  insights.push({
    tone: netToday >= 0 ? "good" : "danger",
    label: "Cash today",
    title: `${netToday >= 0 ? "Positive" : "Negative"} cash position`,
    copy: `${money(todayReceived)} received and ${money(expenseToday)} spent today.`,
    action: netToday >= 0 ? "reports" : "expenses",
    button: netToday >= 0 ? "View report" : "Review expenses"
  });

  if (!todaySales.length) {
    insights.push({
      tone: "info",
      label: "Sales activity",
      title: "No sale recorded today",
      copy: "If trading has started, record the first sale so the daily cash-up stays accurate.",
      action: "sale",
      button: "Record sale"
    });
  } else {
    insights.push({
      tone: "good",
      label: "Sales activity",
      title: `${todaySales.length} sale${todaySales.length === 1 ? "" : "s"} today`,
      copy: `Today's recorded sales total ${money(todaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0))}.`,
      action: "activity",
      button: "View activity"
    });
  }

  if (monthRevenue > 0) {
    insights.push({
      tone: "info",
      label: "Month so far",
      title: `${money(monthRevenue)} revenue`,
      copy: "Use reports to compare cash received, expenses, and unpaid balances.",
      action: "reports",
      button: "Open reports"
    });
  }

  if (!debtors.length && !lowStock.length && todaySales.length && netToday >= 0) {
    insights.unshift({
      tone: "good",
      label: "Status",
      title: "Business records look healthy",
      copy: "No urgent debts or stock alerts need attention right now.",
      action: "reports",
      button: "Review numbers"
    });
  }

  const topInsights = insights.slice(0, 4);
  els.insightCount.textContent = `${topInsights.length} insight${topInsights.length === 1 ? "" : "s"}`;
  els.smartInsights.innerHTML = topInsights
    .map(
      (insight) => `
        <article class="insight-card ${insight.tone}">
          <span>${insight.label}</span>
          <strong>${insight.title}</strong>
          <p>${insight.copy}</p>
          <button class="ghost" type="button" data-insight-action="${insight.action}">${insight.button}</button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll("[data-insight-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.insightAction === "customers") {
        els.customerFilter.value = "owing";
        selectedCustomerId =
          state.customers
            .filter((customer) => Number(customer.balance || 0) > 0)
            .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0]?.id || selectedCustomerId;
        renderCustomers();
      }
      if (button.dataset.insightAction === "inventory") {
        els.inventoryFilter.value = "low";
        renderInventory();
      }
      if (button.dataset.insightAction === "activity") {
        els.activityFilter.value = "sale";
        renderActivity();
      }
      showView(button.dataset.insightAction);
    });
  });
}

function renderBusinessHealth() {
  const today = new Date().toDateString();
  const todaySales = state.sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  const todayPayments = state.payments.filter((payment) => new Date(payment.createdAt).toDateString() === today);
  const todayExpenses = state.expenses.filter((expense) => new Date(expense.createdAt).toDateString() === today);
  const todayReceived =
    todaySales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) +
    todayPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const expenseToday = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const debtors = state.customers.filter((customer) => Number(customer.balance || 0) > 0);
  const lowStock = state.items.filter((item) => !item.isService && Number(item.stock || 0) <= 5);
  const openQuotes = state.quotes.filter((quote) => quote.status !== "Converted");
  const checks = [
    {
      title: "Workspace setup",
      done: Boolean(state.business.isSetup && state.items.length && state.customers.length),
      good: "Business details, accounts, and items are started.",
      bad: "Finish setup, customers, and items."
    },
    {
      title: "Sales activity",
      done: todaySales.length > 0,
      good: `${todaySales.length} sale${todaySales.length === 1 ? "" : "s"} recorded today.`,
      bad: "No sale recorded today."
    },
    {
      title: "Collections",
      done: debtors.length <= 2,
      good: "Outstanding accounts are under control.",
      bad: `${debtors.length} account${debtors.length === 1 ? "" : "s"} need payment follow-up.`
    },
    {
      title: "Stock control",
      done: lowStock.length === 0,
      good: "No low-stock alerts right now.",
      bad: `${lowStock.length} item${lowStock.length === 1 ? "" : "s"} are low on stock.`
    },
    {
      title: "Quote pipeline",
      done: openQuotes.length <= 2,
      good: "Quote follow-ups are manageable.",
      bad: `${openQuotes.length} open quote${openQuotes.length === 1 ? "" : "s"} need follow-up.`
    },
    {
      title: "Cash position",
      done: todayReceived >= expenseToday,
      good: "Today's recorded cash is positive.",
      bad: "Today's expenses are higher than received cash."
    }
  ];
  const completed = checks.filter((check) => check.done).length;
  const score = Math.round((completed / checks.length) * 100);
  const riskCount = checks.length - completed;

  els.healthScore.textContent = `${score}%`;
  els.healthStatus.textContent = score >= 85 ? "Healthy" : score >= 60 ? "Watch list" : "Needs attention";
  els.healthRiskCount.textContent = `${riskCount} action${riskCount === 1 ? "" : "s"}`;
  els.healthChecks.innerHTML = checks
    .map(
      (check) => `
        <article class="health-check ${check.done ? "good" : riskCount >= 3 ? "danger" : "warning"}">
          <strong>${check.title}</strong>
          <span>${check.done ? check.good : check.bad}</span>
        </article>
      `
    )
    .join("");
}

function globalSearchItems() {
  return [
    ...state.customers.map((customer) => ({
      title: customer.name,
      detail: `${customer.phone || "No phone"} - Balance ${money(customer.balance, state.business.currency)}`,
      type: "Customer",
      view: "customers",
      action: () => {
        selectedCustomerId = customer.id;
        els.customerSearch.value = customer.name;
        els.customerFilter.value = "all";
        renderCustomers();
      },
      haystack: [customer.name, customer.phone, customer.balance]
    })),
    ...state.items.map((item) => ({
      title: item.name,
      detail: `${item.isService ? "Service" : "Stock"} - ${money(item.price)} - ${Number(item.stock || 0)} left`,
      type: "Inventory",
      view: "inventory",
      action: () => {
        els.inventorySearch.value = item.name;
        els.inventoryFilter.value = "all";
        renderInventory();
      },
      haystack: [item.name, item.price, item.stock]
    })),
    ...state.sales.map((sale) => {
      const customer = findCustomer(sale.customerId);
      const item = findItem(sale.itemId);
      return {
        title: sale.receipt,
        detail: `${customer?.name || sale.manualCustomerName || "Walk-in"} - ${item?.name || sale.manualItemName || "Item"} - ${money(sale.total, sale.currency)}`,
        type: "Sale",
        view: "activity",
        action: () => {
          els.activitySearch.value = sale.receipt;
          els.activityFilter.value = "sale";
          renderActivity();
        },
        haystack: [sale.receipt, customer?.name, sale.manualCustomerName, item?.name, sale.manualItemName, sale.total]
      };
    }),
    ...state.quotes.map((quote) => {
      const customer = findCustomer(quote.customerId);
      const item = findItem(quote.itemId);
      return {
        title: quote.quoteNumber,
        detail: `${customer?.name || quote.manualCustomerName || "Customer"} - ${item?.name || quote.manualItemName || "Item"} - ${money(quote.total, quote.currency)}`,
        type: "Quote",
        view: "quotes",
        action: () => {},
        haystack: [quote.quoteNumber, customer?.name, quote.manualCustomerName, item?.name, quote.manualItemName, quote.total]
      };
    }),
    ...state.expenses.map((expense) => ({
      title: expense.category,
      detail: `${money(expense.amount, expense.currency)} via ${expense.method} - ${todayStamp(expense.createdAt)}`,
      type: "Expense",
      view: "expenses",
      action: () => {
        els.expenseSearch.value = expense.category;
        els.expenseFilter.value = "all";
        renderExpenses();
      },
      haystack: [expense.category, expense.amount, expense.currency, expense.method, expense.description]
    })),
    ...state.leads.map((lead) => ({
      title: lead.business,
      detail: `${lead.type} - ${lead.status} - ${lead.contact || "No contact"}`,
      type: "Lead",
      view: "outreach",
      action: () => {
        els.leadSearch.value = lead.business;
        els.leadFilter.value = "all";
        renderLeads();
      },
      haystack: [lead.business, lead.contact, lead.type, lead.status, lead.notes]
    }))
  ];
}

function renderGlobalSearch() {
  const query = els.globalSearch.value.trim();
  if (!query) {
    els.globalSearchResults.classList.add("hidden");
    els.globalSearchResults.innerHTML = "";
    return;
  }
  const results = globalSearchItems()
    .filter((item) => includesSearch(item.haystack, query))
    .slice(0, 8);
  els.globalSearchResults.classList.remove("hidden");
  els.globalSearchResults.innerHTML = results.length
    ? results
        .map(
          (item, index) => `
            <button class="search-result" type="button" data-search-index="${index}">
              <strong>${item.title}</strong>
              <span>${item.type} - ${item.detail}</span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state">No matching records.</div>`;

  document.querySelectorAll("[data-search-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = results[Number(button.dataset.searchIndex)];
      if (!item) return;
      item.action();
      showView(item.view);
      els.globalSearch.value = "";
      els.globalSearchResults.classList.add("hidden");
    });
  });
}

function addCurrencyTotal(totals, currency, amount) {
  const key = currency || state.business.currency || "USD";
  totals[key] = Number(totals[key] || 0) + Number(amount || 0);
}

function formatCurrencyTotals(totals) {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Math.abs(Number(amount || 0)) > 0.0001)
    .sort(([currencyA], [currencyB]) => {
      if (currencyA === "USD") return -1;
      if (currencyB === "USD") return 1;
      return currencyA.localeCompare(currencyB);
    });
  if (!entries.length) return money(0, state.business.currency || "USD");
  return entries.map(([currency, amount]) => money(amount, currency)).join(" / ");
}

function dailyCloseData() {
  const today = new Date().toDateString();
  const sales = state.sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  const payments = state.payments.filter((payment) => new Date(payment.createdAt).toDateString() === today);
  const expenses = state.expenses.filter((expense) => new Date(expense.createdAt).toDateString() === today);
  const received = {};
  const spent = {};
  const credit = {};
  const net = {};

  sales.forEach((sale) => {
    addCurrencyTotal(received, sale.currency, sale.paid);
    addCurrencyTotal(credit, sale.currency, sale.balance);
    addCurrencyTotal(net, sale.currency, sale.paid);
  });
  payments.forEach((payment) => {
    addCurrencyTotal(received, payment.currency, payment.amount);
    addCurrencyTotal(net, payment.currency, payment.amount);
  });
  expenses.forEach((expense) => {
    addCurrencyTotal(spent, expense.currency, expense.amount);
    addCurrencyTotal(net, expense.currency, -Number(expense.amount || 0));
  });

  return {
    sales,
    payments,
    expenses,
    received,
    spent,
    credit,
    net,
    creditSales: sales.filter((sale) => Number(sale.balance || 0) > 0)
  };
}

function dailyCloseText() {
  const close = dailyCloseData();
  return [
    `Daily Close - ${currentBusinessName()}`,
    todayStamp(new Date().toISOString()),
    `Received: ${formatCurrencyTotals(close.received)}`,
    `Expenses: ${formatCurrencyTotals(close.spent)}`,
    `Credit given: ${formatCurrencyTotals(close.credit)}`,
    `Net cash: ${formatCurrencyTotals(close.net)}`,
    `Sales recorded: ${close.sales.length}`,
    `Follow-up accounts: ${close.creditSales.length}`,
    "Powered by Danova Technologies"
  ].join("\n");
}

function renderDailyClose() {
  const close = dailyCloseData();
  const highestCreditSale = close.creditSales
    .slice()
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];
  const highestCreditCustomer = highestCreditSale
    ? findCustomer(highestCreditSale.customerId)?.name || highestCreditSale.manualCustomerName || "Walk-in"
    : "";

  els.dailyCloseDate.textContent = todayStamp(new Date().toISOString());
  els.closeReceived.textContent = formatCurrencyTotals(close.received);
  els.closeExpenses.textContent = formatCurrencyTotals(close.spent);
  els.closeCredit.textContent = formatCurrencyTotals(close.credit);
  els.closeNet.textContent = formatCurrencyTotals(close.net);
  els.dailyCloseNotes.innerHTML = `
    <div class="close-note">
      <strong>${close.sales.length} sale${close.sales.length === 1 ? "" : "s"}</strong>
      Recorded today from receipts and manual entries.
    </div>
    <div class="close-note">
      <strong>${close.payments.length} payment${close.payments.length === 1 ? "" : "s"}</strong>
      Collected against existing account balances.
    </div>
    <div class="close-note">
      <strong>${close.creditSales.length} credit sale${close.creditSales.length === 1 ? "" : "s"}</strong>
      ${highestCreditCustomer ? `${highestCreditCustomer} has the largest new balance.` : "No new credit balances today."}
    </div>
  `;
}

function renderDashboard() {
  const today = new Date().toDateString();
  const todayCollected = state.sales
    .filter((sale) => new Date(sale.createdAt).toDateString() === today)
    .reduce((sum, sale) => sum + sale.paid, 0);
  const todayPayments = state.payments
    .filter((payment) => new Date(payment.createdAt).toDateString() === today)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = state.customers.reduce((sum, customer) => sum + customer.balance, 0);
  const stockValue = state.items.reduce((sum, item) => sum + item.price * item.stock, 0);
  const now = new Date();
  const monthRevenue = state.sales
    .filter((sale) => {
      const date = new Date(sale.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, sale) => sum + sale.total, 0);

  els.todayCollected.textContent = money(todayCollected + todayPayments);
  els.outstanding.textContent = money(outstanding);
  els.stockValue.textContent = money(stockValue);
  els.monthRevenue.textContent = money(monthRevenue);
  renderOnboardingChecklist();
  renderBusinessHealth();
  renderSmartInsights();
  renderDailyClose();

  const debtors = state.customers.filter((customer) => customer.balance > 0).slice(0, 4);
  els.attentionList.innerHTML = debtors.length
    ? debtors
        .map(
          (customer) => `
            <div class="attention-item">
              <div class="list-row">
                <strong>${customer.name}</strong>
                <span class="balance">${money(customer.balance)}</span>
              </div>
              <small>${customer.phone}</small>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">No outstanding customer balances.</div>`;

  els.recentSales.innerHTML = state.sales
    .slice()
    .reverse()
    .slice(0, 6)
    .map((sale) => {
      const customer = findCustomer(sale.customerId);
      const customerName = customer?.name || sale.manualCustomerName || "Walk-in";
      return `
        <tr>
          <td data-label="Receipt">${sale.receipt}</td>
          <td data-label="Customer">${customerName}</td>
          <td data-label="Paid" class="paid">${money(sale.paid, sale.currency)}</td>
          <td data-label="Balance" class="${sale.balance > 0 ? "balance" : "paid"}">${money(sale.balance, sale.currency)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderSaleOptions() {
  els.saleCustomer.innerHTML = state.customers
    .map((customer) => `<option value="${customer.id}">${customer.name}</option>`)
    .join("");
  els.saleItem.innerHTML = state.items
    .filter((item) => item.isService || item.stock > 0)
    .map((item) => `<option value="${item.id}">${item.name} - ${money(item.price)}</option>`)
    .join("");
  els.receiptNumber.textContent = `DL-${state.receiptCounter}`;
}

function draftLine(kind, reportErrors = false) {
  const isSale = kind === "sale";
  const manualName = (isSale ? els.manualItem : els.quoteManualItem).value.trim();
  const item = manualName
    ? state.items.find((entry) => entry.name.toLowerCase() === manualName.toLowerCase())
    : findItem((isSale ? els.saleItem : els.quoteItem).value);
  const name = manualName || item?.name || "";
  const priceField = isSale ? els.manualItemPrice : els.quoteManualPrice;
  const quantity = Number((isSale ? els.saleQuantity : els.quoteQuantity).value || 1);
  const unitPrice = manualName && priceField.value !== "" ? Number(priceField.value) : Number(item?.price || 0);
  if (!name || quantity <= 0 || unitPrice < 0) {
    if (reportErrors) alert("Choose an item and enter a valid quantity and price.");
    return null;
  }
  if (isSale && item && !item.isService) {
    const alreadyAdded = saleDraftLines.filter((line) => line.itemId === item.id).reduce((sum, line) => sum + line.quantity, 0);
    if (quantity + alreadyAdded > Number(item.stock || 0)) {
      if (reportErrors) alert(`Only ${item.stock} ${item.name} available in stock.`);
      return null;
    }
  }
  return { id: createId("ln"), itemId: item?.id || "", name, quantity, unitPrice, amount: unitPrice * quantity, isService: item ? Boolean(item.isService) : true };
}

function renderDraftLines(kind) {
  const isSale = kind === "sale";
  const lines = isSale ? saleDraftLines : quoteDraftLines;
  const container = isSale ? els.saleDraftLines : els.quoteDraftLines;
  const currency = (isSale ? els.saleCurrency : els.quoteCurrency).value;
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  (isSale ? els.saleDraftTotal : els.quoteDraftTotal).textContent = money(total, currency);
  (isSale ? els.saveSale : els.saveQuote).disabled = !lines.length;
  container.innerHTML = lines.length ? lines.map((line) => `
    <div class="draft-line">
      <div><strong>${escapeHtml(line.name)}</strong><span>${line.quantity} x ${money(line.unitPrice, currency)}</span></div>
      <strong>${money(line.amount, currency)}</strong>
      <button class="icon-button" type="button" data-remove-${kind}-line="${line.id}" aria-label="Remove ${escapeHtml(line.name)}" title="Remove item">&times;</button>
    </div>`).join("") : "<p>No items added yet.</p>";
}

function addDraftLine(kind) {
  const line = draftLine(kind, true);
  if (!line) return;
  if (kind === "sale") saleDraftLines.push(line);
  else quoteDraftLines.push(line);
  const manualName = kind === "sale" ? els.manualItem : els.quoteManualItem;
  const manualPrice = kind === "sale" ? els.manualItemPrice : els.quoteManualPrice;
  const quantity = kind === "sale" ? els.saleQuantity : els.quoteQuantity;
  manualName.value = "";
  manualPrice.value = "";
  quantity.value = 1;
  renderDraftLines(kind);
  kind === "sale" ? renderReceipt(null) : renderQuotePreview(null);
}

function renderQuoteOptions() {
  els.quoteCustomer.innerHTML = state.customers
    .map((customer) => `<option value="${customer.id}">${customer.name}</option>`)
    .join("");
  els.quoteItem.innerHTML = state.items
    .map((item) => `<option value="${item.id}">${item.name} - ${money(item.price)}</option>`)
    .join("");
  els.quoteNumber.textContent = `QT-${state.quoteCounter}`;
}

function renderQuotePreview(quote = lastQuote) {
  if (!quote) {
    const customer = els.quoteManualCustomer.value.trim()
      ? { name: els.quoteManualCustomer.value.trim() }
      : findCustomer(els.quoteCustomer.value) || state.customers[0];
    const previewLine = draftLine("quote");
    const lines = quoteDraftLines.length ? quoteDraftLines : (previewLine ? [previewLine] : []);
    const createdAt = new Date();
    const validUntil = new Date(createdAt);
    validUntil.setDate(validUntil.getDate() + Number(els.quoteValidDays.value || 7));
    quote = {
      quoteNumber: `QT-${state.quoteCounter}`,
      customerId: customer?.id,
      manualCustomerName: customer?.name,
      lines,
      currency: els.quoteCurrency.value,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      notes: els.quoteNotes.value.trim(),
      createdAt: createdAt.toISOString(),
      validUntil: validUntil.toISOString()
    };
  }
  const details = quoteDetails(quote);
  els.quotePreview.innerHTML = details
    ? `
      <div class="quote-document">
        <div class="quote-topbar"></div>
        <header class="quote-doc-header">
          <div>
            <span class="quote-brand-kicker">Prepared by</span>
            <h3>${escapeHtml(details.businessName)}</h3>
            <p>${escapeHtml(details.businessMeta || "Business quote")}</p>
          </div>
          <div class="quote-badge">
            <span>Quote</span>
            <strong>${escapeHtml(details.quoteNumber)}</strong>
          </div>
        </header>

        <section class="quote-doc-meta">
          <article>
            <span>Bill to</span>
            <strong>${escapeHtml(details.customerName)}</strong>
            <p>${escapeHtml(details.customerPhone || "Customer contact not saved")}</p>
          </article>
          <article>
            <span>Quote date</span>
            <strong>${escapeHtml(details.date)}</strong>
            <p>Valid until ${escapeHtml(details.validUntil)}</p>
          </article>
        </section>

        <table class="quote-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${details.lines.map((line) => `<tr>
            <td>${escapeHtml(line.name)}</td>
            <td>${escapeHtml(line.quantity)}</td>
            <td>${escapeHtml(money(line.unitPrice, details.currency))}</td>
            <td>${escapeHtml(money(line.amount, details.currency))}</td>
          </tr>`).join("")}</tbody>
        </table>

        <section class="quote-summary">
          <div class="quote-note">
            <span>Notes / terms</span>
            <p>${escapeHtml(details.notes)}</p>
          </div>
          <div class="quote-total-box">
            <div><span>Subtotal</span><strong>${escapeHtml(details.subtotal)}</strong></div>
            <div><span>Currency</span><strong>${escapeHtml(details.currency)}</strong></div>
            <div class="quote-grand-total"><span>Total</span><strong>${escapeHtml(details.total)}</strong></div>
          </div>
        </section>

        <footer class="quote-footer">
          <span>Thank you for your business.</span>
          <strong>Powered by Danova Technologies</strong>
        </footer>
      </div>
    `
    : `<div class="empty-state">Create a quote to preview it here.</div>`;
}

function convertQuoteToSale(quoteId) {
  const quote = state.quotes.find((entry) => entry.id === quoteId);
  if (!quote) return;
  const customer = findCustomer(quote.customerId);
  const lines = documentLines(quote);
  if (!customer || !lines.length) {
    alert("This quote needs a saved customer and at least one item before it can become a sale.");
    return;
  }
  const unavailable = lines.find((line) => {
    const item = findItem(line.itemId);
    return item && !item.isService && Number(item.stock || 0) < Number(line.quantity || 0);
  });
  if (unavailable) {
    alert(`There is not enough ${unavailable.name} in stock to convert this quote.`);
    return;
  }
  const paid = Number(prompt("Amount paid now? Enter 0 for credit sale.", "0") || 0);
  const balance = Math.max(Number(quote.total || 0) - paid, 0);
  const sale = {
    id: createId("s"),
    receipt: `DL-${state.receiptCounter}`,
    customerId: customer.id,
    itemId: lines[0].itemId,
    manualCustomerName: customer.name,
    manualItemName: lines[0].name,
    quantity: lines[0].quantity,
    lines,
    currency: quote.currency,
    method: paid > 0 ? "Cash" : "Credit",
    total: quote.total,
    paid,
    balance,
    notes: `Converted from ${quote.quoteNumber}. ${quote.notes || ""}`.trim(),
    createdAt: new Date().toISOString()
  };
  lines.forEach((line) => {
    const item = findItem(line.itemId);
    if (item && !item.isService) item.stock = Math.max(Number(item.stock || 0) - Number(line.quantity || 0), 0);
  });
  customer.balance = Number((Number(customer.balance || 0) + balance).toFixed(2));
  quote.status = "Converted";
  quote.convertedReceipt = sale.receipt;
  state.sales.push(sale);
  state.receiptCounter += 1;
  lastReceipt = sale;
  saveState();
  renderAll();
  showView("sale");
}

function renderQuotes() {
  els.quoteCount.textContent = `${state.quotes.length} quote${state.quotes.length === 1 ? "" : "s"}`;
  els.quoteList.innerHTML = state.quotes.length
    ? state.quotes
        .slice()
        .reverse()
        .map((quote) => {
          const customer = findCustomer(quote.customerId);
          const lines = documentLines(quote);
          return `
            <article class="quote-card">
              <div>
                <h3>${quote.quoteNumber} - ${customer?.name || quote.manualCustomerName || "Customer"}</h3>
                <p>${lines.length} item${lines.length === 1 ? "" : "s"} - ${money(quote.total, quote.currency)} - ${quote.status || "Open"}</p>
              </div>
              <div class="quote-actions">
                <button class="ghost" type="button" data-quote-copy="${quote.id}">Copy</button>
                <button class="ghost" type="button" data-quote-whatsapp="${quote.id}">WhatsApp</button>
                <button class="ghost" type="button" data-quote-convert="${quote.id}" ${quote.status === "Converted" ? "disabled" : ""}>Convert</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No quotes saved yet.</div>`;

  document.querySelectorAll("[data-quote-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const quote = state.quotes.find((entry) => entry.id === button.dataset.quoteCopy);
      await copyText(quoteText(quote));
      alert("Quote copied.");
    });
  });
  document.querySelectorAll("[data-quote-whatsapp]").forEach((button) => {
    button.addEventListener("click", () => {
      const quote = state.quotes.find((entry) => entry.id === button.dataset.quoteWhatsapp);
      const customer = findCustomer(quote?.customerId);
      window.open(whatsappUrl(customer?.phone, quoteText(quote)), "_blank");
    });
  });
  document.querySelectorAll("[data-quote-convert]").forEach((button) => {
    button.addEventListener("click", () => convertQuoteToSale(button.dataset.quoteConvert));
  });
}

function renderFollowups() {
  const debtors = state.customers
    .filter((customer) => Number(customer.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  const openQuotes = state.quotes
    .filter((quote) => quote.status !== "Converted")
    .sort((a, b) => new Date(a.validUntil) - new Date(b.validUntil));
  const followupTotals = {};
  debtors.forEach((customer) => addCurrencyTotal(followupTotals, state.business.currency, customer.balance));
  openQuotes.forEach((quote) => addCurrencyTotal(followupTotals, quote.currency, quote.total));

  els.followupDebtorCount.textContent = `${debtors.length}`;
  els.followupQuoteCount.textContent = `${openQuotes.length}`;
  els.followupValue.textContent = formatCurrencyTotals(followupTotals);

  els.paymentFollowups.innerHTML = debtors.length
    ? debtors
        .map((customer) => {
          const message = balanceReminderText(customer);
          return `
            <article class="followup-card">
              <div class="followup-card-head">
                <div>
                  <h3>${customer.name}</h3>
                  <p>${customer.phone || "No phone number saved"}</p>
                </div>
                <span class="balance">${money(customer.balance, state.business.currency)}</span>
              </div>
              <div class="followup-message">${message}</div>
              <div class="followup-actions">
                <button class="ghost" type="button" data-copy-balance="${customer.id}">Copy message</button>
                <button class="ghost" type="button" data-whatsapp-balance="${customer.id}">WhatsApp</button>
                <button class="ghost" type="button" data-pay-balance="${customer.id}">Receive payment</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No unpaid customer balances to follow up.</div>`;

  els.quoteFollowups.innerHTML = openQuotes.length
    ? openQuotes
        .map((quote) => {
          const customer = findCustomer(quote.customerId);
          const item = findItem(quote.itemId);
          const message = quoteReminderText(quote);
          return `
            <article class="followup-card">
              <div class="followup-card-head">
                <div>
                  <h3>${quote.quoteNumber} - ${customer?.name || quote.manualCustomerName || "Customer"}</h3>
                  <p>${item?.name || quote.manualItemName || "Item"} - valid until ${todayStamp(quote.validUntil)}</p>
                </div>
                <span class="paid">${money(quote.total, quote.currency)}</span>
              </div>
              <div class="followup-message">${message}</div>
              <div class="followup-actions">
                <button class="ghost" type="button" data-copy-quote-followup="${quote.id}">Copy message</button>
                <button class="ghost" type="button" data-whatsapp-quote-followup="${quote.id}">WhatsApp</button>
                <button class="ghost" type="button" data-convert-followup="${quote.id}">Convert to sale</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No open quotes to follow up.</div>`;

  document.querySelectorAll("[data-copy-balance]").forEach((button) => {
    button.addEventListener("click", async () => {
      const customer = findCustomer(button.dataset.copyBalance);
      await copyText(balanceReminderText(customer));
      alert("Payment reminder copied.");
    });
  });
  document.querySelectorAll("[data-whatsapp-balance]").forEach((button) => {
    button.addEventListener("click", () => {
      const customer = findCustomer(button.dataset.whatsappBalance);
      window.open(whatsappUrl(customer?.phone, balanceReminderText(customer)), "_blank", "noopener");
    });
  });
  document.querySelectorAll("[data-pay-balance]").forEach((button) => {
    button.addEventListener("click", () => {
      els.paymentCustomer.value = button.dataset.payBalance;
      showView("payments");
    });
  });
  document.querySelectorAll("[data-copy-quote-followup]").forEach((button) => {
    button.addEventListener("click", async () => {
      const quote = state.quotes.find((entry) => entry.id === button.dataset.copyQuoteFollowup);
      await copyText(quoteReminderText(quote));
      alert("Quote follow-up copied.");
    });
  });
  document.querySelectorAll("[data-whatsapp-quote-followup]").forEach((button) => {
    button.addEventListener("click", () => {
      const quote = state.quotes.find((entry) => entry.id === button.dataset.whatsappQuoteFollowup);
      const customer = findCustomer(quote?.customerId);
      window.open(whatsappUrl(customer?.phone, quoteReminderText(quote)), "_blank", "noopener");
    });
  });
  document.querySelectorAll("[data-convert-followup]").forEach((button) => {
    button.addEventListener("click", () => convertQuoteToSale(button.dataset.convertFollowup));
  });
}

function renderPaymentOptions() {
  const owingCustomers = state.customers.filter((customer) => customer.balance > 0);
  const options = (owingCustomers.length ? owingCustomers : state.customers)
    .map((customer) => `<option value="${customer.id}">${customer.name} - owes ${money(customer.balance)}</option>`)
    .join("");
  els.paymentCustomer.innerHTML = options;
  els.paymentCount.textContent = `${state.payments.length}`;
  els.recentPayments.innerHTML = state.payments.length
    ? state.payments
        .slice()
        .reverse()
        .slice(0, 8)
        .map((payment) => {
          const customer = findCustomer(payment.customerId);
          return `
            <tr>
              <td>${customer?.name || payment.customerName || "Customer"}</td>
              <td class="paid">${money(payment.amount, payment.currency)}</td>
              <td>${payment.method}</td>
              <td>${todayStamp(payment.createdAt)}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4">No payments recorded yet.</td></tr>`;
}

function renderReceipt(sale = lastReceipt) {
  if (!sale) {
    const customer = els.manualCustomer.value.trim()
      ? { name: els.manualCustomer.value.trim() }
      : findCustomer(els.saleCustomer.value) || state.customers[0];
    const previewLine = draftLine("sale");
    const lines = saleDraftLines.length ? saleDraftLines : (previewLine ? [previewLine] : []);
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const paid = Number(els.amountPaid.value || 0);
    sale = {
      receipt: `DL-${state.receiptCounter}`,
      customerId: customer?.id,
      manualCustomerName: customer?.name,
      lines,
      currency: els.saleCurrency.value,
      method: els.paymentMethod.value,
      total,
      paid,
      balance: Math.max(total - paid, 0),
      notes: els.saleNotes.value,
      createdAt: new Date().toISOString()
    };
  }

  const details = receiptDetails(sale);
  els.receiptPreview.innerHTML = `
    <h3>${details.businessName}</h3>
    <p>${details.location}${details.location && details.phone ? " - " : ""}${details.phone}</p>
    <p>${details.receipt} - ${details.date}</p>
    <div class="receipt-line"><span>Customer</span><strong>${details.customerName}</strong></div>
    <div class="receipt-items">${details.lines.map((line) => `<div class="receipt-item-row">
      <div><strong>${escapeHtml(line.name)}</strong><span>${line.quantity} x ${money(line.unitPrice, sale.currency)}</span></div>
      <strong>${money(line.amount, sale.currency)}</strong>
    </div>`).join("")}</div>
    <div class="receipt-line"><span>Method</span><strong>${sale.method}</strong></div>
    <div class="receipt-line"><span>Total</span><strong>${money(sale.total, sale.currency)}</strong></div>
    <div class="receipt-line"><span>Paid</span><strong>${money(sale.paid, sale.currency)}</strong></div>
    <div class="receipt-line receipt-total"><span>Balance</span><span>${money(sale.balance, sale.currency)}</span></div>
    <p>${sale.notes || "Thank you for your business."}</p>
    <small>Powered by Danova Technologies</small>
  `;
}

function renderCustomers() {
  const preset = getBusinessPreset();
  const query = els.customerSearch.value.trim();
  const filter = els.customerFilter.value;
  const filteredCustomers = state.customers.filter((customer) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "owing" && Number(customer.balance || 0) > 0) ||
      (filter === "settled" && Number(customer.balance || 0) <= 0);
    return matchesFilter && includesSearch([customer.name, customer.phone, customer.balance], query);
  });
  els.customerCount.textContent = `${filteredCustomers.length}/${state.customers.length}`;
  els.customerList.innerHTML = filteredCustomers.length
    ? filteredCustomers
    .map(
      (customer) => `
        <button class="list-item customer-button ${customer.id === selectedCustomerId ? "active-account" : ""}" type="button" data-customer-id="${customer.id}">
          <div class="list-row">
            <strong>${customer.name}</strong>
            <span class="${customer.balance > 0 ? "balance" : "paid"}">${money(customer.balance)}</span>
          </div>
          <small>${customer.phone}</small>
        </button>
      `
    )
    .join("")
    : `<div class="empty-state">No matching accounts.</div>`;

  document.querySelectorAll(".customer-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCustomerId = button.dataset.customerId;
      renderCustomers();
    });
  });

  if (!selectedCustomerId && state.customers.some((customer) => customer.balance > 0)) {
    selectedCustomerId = state.customers.find((customer) => customer.balance > 0).id;
  } else if (!selectedCustomerId && state.customers.length) {
    selectedCustomerId = state.customers[0].id;
  }
  els.customerProfileTitle.textContent = `${preset.customerLabel} Profile`;
  renderCustomerProfile();
}

function renderCustomerProfile() {
  const customer = findCustomer(selectedCustomerId);
  const profilePanel = els.customerProfile.closest(".panel");
  if (!customer) {
    els.customerProfileStatus.textContent = "Select account";
    els.customerProfile.className = "empty-state";
    els.customerProfile.textContent = "Select an account to view history.";
    profilePanel?.classList.remove("statement-panel");
    return;
  }

  const sales = state.sales.filter((sale) => sale.customerId === customer.id);
  const payments = state.payments.filter((payment) => payment.customerId === customer.id);
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) + payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const events = [
    ...sales.map((sale) => ({ kind: "sale", createdAt: sale.createdAt, data: sale })),
    ...payments.map((payment) => ({ kind: "payment", createdAt: payment.createdAt, data: payment }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const message = balanceReminderText(customer);
  const link = customer.phone ? whatsappUrl(customer.phone, message) : "";
  const statement = customerStatementDetails(customer);
  profilePanel?.classList.add("statement-panel");
  els.customerProfileStatus.textContent = customer.balance > 0 ? "Owes balance" : "Settled";
  els.customerProfile.className = "account-profile";
  els.customerProfile.innerHTML = `
    <div class="account-head">
      <h3>${customer.name}</h3>
      <p>${customer.phone || "No phone number saved"}</p>
    </div>
    <div class="account-stats">
      <div class="account-stat"><span>Total sales</span><strong>${money(totalSales)}</strong></div>
      <div class="account-stat"><span>Total paid</span><strong class="paid">${money(totalPaid)}</strong></div>
      <div class="account-stat"><span>Balance</span><strong class="${customer.balance > 0 ? "balance" : "paid"}">${money(customer.balance)}</strong></div>
    </div>
    <div class="profile-actions">
      <button class="ghost" id="profileReceivePayment" type="button">Receive payment</button>
      <button class="ghost" id="copyCustomerStatement" type="button">Copy statement</button>
      <button class="ghost" id="printCustomerStatement" type="button">Print statement</button>
      ${customer.phone ? `<button class="ghost" id="whatsappCustomerStatement" type="button">WhatsApp statement</button>` : ""}
      ${link ? `<a class="whatsapp-link" href="${link}" target="_blank" rel="noopener">Open WhatsApp</a>` : ""}
    </div>
    ${customer.balance > 0 ? `<div class="reminder-message">${message}</div>` : `<div class="reminder-message">This account has no outstanding balance.</div>`}
    <section class="account-statement-print" aria-label="Customer statement preview">
      <div class="statement-topbar"></div>
      <header class="statement-header">
        <div>
          <span>Customer statement</span>
          <h3>${escapeHtml(statement.businessName)}</h3>
          <p>${escapeHtml(statement.businessMeta || "Business account statement")}</p>
        </div>
        <div class="statement-balance ${statement.balance > 0 ? "is-owing" : "is-clear"}">
          <span>Balance due</span>
          <strong>${money(statement.balance, statement.currency)}</strong>
        </div>
      </header>
      <div class="statement-meta">
        <article><span>Customer</span><strong>${escapeHtml(statement.customerName)}</strong><small>${escapeHtml(statement.customerPhone || "No phone saved")}</small></article>
        <article><span>Statement date</span><strong>${statement.date}</strong><small>${statement.rows.length} transaction${statement.rows.length === 1 ? "" : "s"}</small></article>
        <article><span>Total sales</span><strong>${money(statement.totalSales, statement.currency)}</strong><small>Total paid ${money(statement.totalPaid, statement.currency)}</small></article>
      </div>
      <div class="table-wrap statement-table-wrap">
        <table class="statement-table">
          <thead><tr><th>Date</th><th>Activity</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
          <tbody>
            ${statement.rows.length ? statement.rows.map((row) => `
              <tr>
                <td>${todayStamp(row.createdAt)}</td>
                <td><strong>${escapeHtml(row.type)} ${escapeHtml(row.reference)}</strong><small>${escapeHtml(row.detail)}</small></td>
                <td>${row.debit ? money(row.debit, statement.currency) : "-"}</td>
                <td>${row.credit ? money(row.credit, statement.currency) : "-"}</td>
                <td><strong>${money(row.balance, statement.currency)}</strong></td>
              </tr>
            `).join("") : `<tr><td colspan="5">No transactions recorded yet.</td></tr>`}
          </tbody>
        </table>
      </div>
      <footer class="statement-footer">
        <span>Generated by LedgerLite</span>
        <strong>Powered by Danova Technologies</strong>
      </footer>
    </section>
    <div>
      <h2>History</h2>
      <div class="timeline">
        ${
          events.length
            ? events
                .slice(0, 8)
                .map((event) => {
                  if (event.kind === "payment") {
                    const payment = event.data;
                    return `<div class="timeline-item"><strong>Payment received</strong><br><span class="paid">${money(payment.amount, payment.currency)}</span> via ${payment.method}<small>${todayStamp(payment.createdAt)}</small></div>`;
                  }
                  const sale = event.data;
                  const item = findItem(sale.itemId);
                  const itemName = item?.name || sale.manualItemName || "Item";
                  return `<div class="timeline-item"><strong>${sale.receipt}</strong><br>${itemName} - ${money(sale.total, sale.currency)} total, ${money(sale.balance, sale.currency)} balance<small>${todayStamp(sale.createdAt)}</small></div>`;
                })
                .join("")
            : `<div class="timeline-item">No transactions yet.</div>`
        }
      </div>
    </div>
  `;

  document.querySelector("#profileReceivePayment")?.addEventListener("click", () => {
    showView("payments");
    els.paymentCustomer.value = customer.id;
  });
  document.querySelector("#copyCustomerStatement")?.addEventListener("click", async () => {
    await copyText(customerStatementText(customer));
    alert("Customer statement copied.");
  });
  document.querySelector("#whatsappCustomerStatement")?.addEventListener("click", () => {
    window.open(whatsappUrl(customer.phone, customerStatementText(customer)), "_blank", "noopener");
  });
  document.querySelector("#printCustomerStatement")?.addEventListener("click", () => {
    document.body.classList.add("print-statement-mode");
    window.print();
    window.setTimeout(() => document.body.classList.remove("print-statement-mode"), 500);
  });
}

function renderInventory() {
  const query = els.inventorySearch.value.trim();
  const filter = els.inventoryFilter.value;
  const filteredItems = state.items.filter((item) => {
    const stock = Number(item.stock || 0);
    const matchesFilter =
      filter === "all" ||
      (filter === "low" && !item.isService && stock <= 5) ||
      (filter === "service" && item.isService) ||
      (filter === "stocked" && !item.isService);
    return matchesFilter && includesSearch([item.name, item.price, item.stock], query);
  });
  els.itemCount.textContent = `${filteredItems.length}/${state.items.length} items`;
  els.inventoryTable.innerHTML = filteredItems.length
    ? filteredItems
    .map(
      (item) => `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td>${money(item.price)}</td>
          <td>${item.stock}</td>
          <td>${money(item.price * item.stock)}</td>
        </tr>
      `
    )
    .join("")
    : `<tr><td colspan="4">No matching inventory or services.</td></tr>`;
}

function renderExpenses() {
  const query = els.expenseSearch.value.trim();
  const filter = els.expenseFilter.value;
  const filteredExpenses = state.expenses.filter((expense) => {
    const matchesFilter = filter === "all" || expense.category === filter;
    return matchesFilter && includesSearch([expense.category, expense.amount, expense.currency, expense.method, expense.description], query);
  });
  els.expenseCount.textContent = `${filteredExpenses.length}/${state.expenses.length}`;
  els.recentExpenses.innerHTML = filteredExpenses.length
    ? filteredExpenses
        .slice()
        .reverse()
        .slice(0, 8)
        .map(
          (expense) => `
            <tr>
              <td><strong>${expense.category}</strong><br><small>${expense.description || "-"}</small></td>
              <td class="balance">${money(expense.amount, expense.currency)}</td>
              <td>${expense.method}</td>
              <td>${todayStamp(expense.createdAt)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4">No expenses recorded yet.</td></tr>`;
}

function renderReports() {
  const totalSales = state.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const salesPaid = state.sales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0);
  const laterPayments = state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalExpenses = state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const outstanding = state.customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0);
  const lowStockItems = state.items.filter((item) => !item.isService && Number(item.stock || 0) <= 5);

  els.reportTotalSales.textContent = money(totalSales);
  els.reportTotalReceived.textContent = money(salesPaid + laterPayments);
  els.reportTotalExpenses.textContent = money(totalExpenses);
  els.reportNetCash.textContent = money(salesPaid + laterPayments - totalExpenses);
  els.reportOutstanding.textContent = money(outstanding);
  els.reportLowStock.textContent = `${lowStockItems.length}`;

  const debtors = state.customers
    .filter((customer) => Number(customer.balance || 0) > 0)
    .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
    .slice(0, 8);
  els.reportDebtors.innerHTML = debtors.length
    ? debtors
        .map(
          (customer) => `
            <tr>
              <td><strong>${customer.name}</strong></td>
              <td>${customer.phone || "-"}</td>
              <td class="balance">${money(customer.balance)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="3">No customer balances outstanding.</td></tr>`;

  els.reportStock.innerHTML = lowStockItems.length
    ? lowStockItems
        .map(
          (item) => `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td class="${item.stock === 0 ? "balance" : ""}">${item.stock}</td>
              <td>${money(item.price * item.stock)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="3">No low stock items.</td></tr>`;
}

function renderActivity() {
  const saleEvents = state.sales.map((sale) => ({ kind: "sale", createdAt: sale.createdAt, data: sale }));
  const paymentEvents = state.payments.map((payment) => ({ kind: "payment", createdAt: payment.createdAt, data: payment }));
  const expenseEvents = state.expenses.map((expense) => ({ kind: "expense", createdAt: expense.createdAt, data: expense }));
  const query = els.activitySearch.value.trim();
  const filter = els.activityFilter.value;
  const events = [...saleEvents, ...paymentEvents, ...expenseEvents]
    .filter((event) => {
      if (filter !== "all" && event.kind !== filter) return false;
      if (!query) return true;
      if (event.kind === "expense") {
        const expense = event.data;
        return includesSearch([expense.category, expense.amount, expense.currency, expense.method, expense.description], query);
      }
      if (event.kind === "payment") {
        const payment = event.data;
        const customer = findCustomer(payment.customerId);
        return includesSearch([customer?.name, payment.customerName, payment.amount, payment.currency, payment.method, payment.note], query);
      }
      const sale = event.data;
      const customer = findCustomer(sale.customerId);
      const item = findItem(sale.itemId);
      return includesSearch([sale.receipt, customer?.name, sale.manualCustomerName, item?.name, sale.manualItemName, sale.total, sale.method, sale.notes], query);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  els.activityFeed.innerHTML = events
    .length
    ? events
    .map((event) => {
      if (event.kind === "expense") {
        const expense = event.data;
        return `
          <div class="activity-item">
            <strong>Expense recorded: ${expense.category}</strong>
            <span>${money(expense.amount, expense.currency)} paid via ${expense.method}</span>
            <small>${todayStamp(expense.createdAt)}</small>
          </div>
        `;
      }
      if (event.kind === "payment") {
        const payment = event.data;
        const customer = findCustomer(payment.customerId);
        return `
          <div class="activity-item">
            <strong>Payment received from ${customer?.name || payment.customerName || "Customer"}</strong>
            <span>${money(payment.amount, payment.currency)} via ${payment.method}</span>
            <small>${todayStamp(payment.createdAt)}</small>
          </div>
        `;
      }
      const sale = event.data;
      const customer = findCustomer(sale.customerId);
      const item = findItem(sale.itemId);
      const customerName = customer?.name || sale.manualCustomerName || "Walk-in";
      const itemName = item?.name || sale.manualItemName || "item";
      return `
        <div class="activity-item">
          <strong>${sale.receipt}: ${customerName} bought ${sale.quantity} x ${itemName}</strong>
          <span>${money(sale.total, sale.currency)} total, ${money(sale.paid, sale.currency)} paid via ${sale.method}</span>
          <small>${todayStamp(sale.createdAt)}</small>
        </div>
      `;
    })
    .join("")
    : `<div class="empty-state">No matching activity.</div>`;
}

function leadFollowupText(lead) {
  return `Hello ${lead.business}, thank you for considering LedgerLite. I can help set up a quick demo using your business type (${lead.type}) so you can see sales, receipts, balances, and follow-ups in action. Would this week work for a short setup session?`;
}

function renderLeadMetrics() {
  const total = state.leads.length;
  const countStatus = (statuses) => state.leads.filter((lead) => statuses.includes(lead.status)).length;
  const dueToday = state.leads.filter((lead) => {
    const status = dueStatus(lead.dueDate);
    return ["is-overdue", "is-due"].includes(status.className) && !["Won", "Not now"].includes(lead.status);
  }).length;
  const contacted = countStatus(["Contacted", "Demo booked", "Trial setup", "Won"]);
  const demos = countStatus(["Demo booked", "Trial setup", "Won"]);
  const trials = countStatus(["Trial setup", "Won"]);
  const won = countStatus(["Won"]);
  const winRate = total ? Math.round((won / total) * 100) : 0;
  const nextMilestone = won
    ? "Collect testimonial"
    : trials
      ? "Close first paying user"
      : demos
        ? "Set up first trial"
        : contacted
          ? "Book first demo"
          : "Contact first lead";

  els.weeklyLeadProgress.textContent = `${Math.min(total, 25)} / 25 leads`;
  els.nextOutreachMilestone.textContent = nextMilestone;
  els.leadsDueToday.textContent = `${dueToday} lead${dueToday === 1 ? "" : "s"}`;
  els.metricTotalLeads.textContent = `${total}`;
  els.metricContacted.textContent = `${contacted}`;
  els.metricDemos.textContent = `${demos}`;
  els.metricTrials.textContent = `${trials}`;
  els.metricWon.textContent = `${won}`;
  els.metricWinRate.textContent = `${winRate}%`;
}

function renderLeads() {
  renderLeadMetrics();
  const query = els.leadSearch.value.trim();
  const filter = els.leadFilter.value;
  const leads = state.leads
    .filter((lead) => {
      const matchesStatus = filter === "all" || lead.status === filter;
      return matchesStatus && includesSearch([lead.business, lead.contact, lead.type, lead.status, lead.nextAction, lead.notes], query);
    })
    .sort((a, b) => {
      const aDue = dueStatus(a.dueDate);
      const bDue = dueStatus(b.dueDate);
      if (aDue.sort !== bDue.sort) return aDue.sort - bDue.sort;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

  els.leadCount.textContent = `${leads.length}/${state.leads.length} lead${state.leads.length === 1 ? "" : "s"}`;
  els.leadList.innerHTML = leads.length
    ? leads
        .map(
          (lead) => {
            const status = dueStatus(lead.dueDate);
            return `
            <article class="lead-card">
              <div class="lead-card-head">
                <div>
                  <h3>${lead.business}</h3>
                  <p>${lead.type} - ${lead.contact || "No contact saved"}</p>
                </div>
                <span class="lead-status">${lead.status}</span>
              </div>
              <div class="lead-next">
                <span>${lead.nextAction || "Send opener"}</span>
                <strong class="${status.className}">${status.label}</strong>
              </div>
              <p>${lead.notes || "No notes yet."}</p>
              <div class="lead-actions">
                <button class="ghost" type="button" data-lead-copy="${lead.id}">Copy follow-up</button>
                <button class="ghost" type="button" data-lead-tomorrow="${lead.id}">Tomorrow</button>
                <button class="ghost" type="button" data-lead-status="${lead.id}" data-next-status="Contacted">Contacted</button>
                <button class="ghost" type="button" data-lead-status="${lead.id}" data-next-status="Demo booked">Demo booked</button>
                <button class="ghost" type="button" data-lead-status="${lead.id}" data-next-status="Trial setup">Trial setup</button>
              </div>
            </article>
          `;
          }
        )
        .join("")
    : `<div class="empty-state">No matching leads yet.</div>`;

  document.querySelectorAll("[data-lead-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const lead = state.leads.find((entry) => entry.id === button.dataset.leadCopy);
      await copyText(leadFollowupText(lead));
      alert("Lead follow-up copied.");
    });
  });
  document.querySelectorAll("[data-lead-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const lead = state.leads.find((entry) => entry.id === button.dataset.leadStatus);
      if (!lead) return;
      lead.status = button.dataset.nextStatus;
      lead.nextAction = nextActionForStatus(button.dataset.nextStatus);
      lead.dueDate = dateInputValue(1);
      lead.updatedAt = new Date().toISOString();
      saveState();
      renderLeads();
    });
  });
  document.querySelectorAll("[data-lead-tomorrow]").forEach((button) => {
    button.addEventListener("click", () => {
      const lead = state.leads.find((entry) => entry.id === button.dataset.leadTomorrow);
      if (!lead) return;
      lead.dueDate = dateInputValue(1);
      lead.updatedAt = new Date().toISOString();
      saveState();
      renderLeads();
    });
  });
}

function renderAll() {
  renderAccessState();
  renderBusinessProfile();
  updateInstallReadiness();
  renderDashboard();
  renderSaleOptions();
  renderQuoteOptions();
  renderQuotePreview();
  renderQuotes();
  renderFollowups();
  renderPaymentOptions();
  renderReceipt();
  renderDraftLines("sale");
  renderDraftLines("quote");
  renderCustomers();
  renderRecurringBilling();
  renderBusinessNotifications();
  notifyBusinessForReadyReminders();
  renderInventory();
  renderExpenses();
  renderReports();
  renderActivity();
  renderLeads();
  renderStaff();
  renderBilling();
  renderCloudHealth();
}

function createId(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function downloadTextFile(filename, content, type = "text/csv") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(","))
  ].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((values) =>
    headers.reduce((record, header, index) => {
      record[header] = values[index] || "";
      return record;
    }, {})
  );
}

function readCsvFile(input, handler) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result || ""));
    handler(rows);
    input.value = "";
  };
  reader.readAsText(file);
}

function firstValue(row, keys, fallback = "") {
  const key = keys.find((candidate) => row[candidate] !== undefined && row[candidate] !== "");
  return key ? row[key] : fallback;
}

function safeDateIso(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  els.connectionStatus.textContent = online ? "Online" : "Offline ready";
  els.connectionStatus.classList.toggle("offline", !online);
}

function updateInstallReadiness() {
  const canInstall = Boolean(deferredInstallPrompt);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  els.installApp.disabled = !canInstall || isStandalone;
  els.installApp.textContent = isStandalone ? "Installed" : canInstall ? "Install app" : "Install available soon";
  els.installStatus.textContent = isStandalone ? "Installed on this device" : canInstall ? "Ready to install" : "Browser install prompt waiting";
  els.installStatus.classList.toggle("ready", canInstall || isStandalone);
  els.offlineStatus.textContent = "Offline cache ready after first visit";
  els.offlineStatus.classList.toggle("ready", "serviceWorker" in navigator);
  els.backupStatus.textContent = state.sales.length || state.customers.length ? "Local data active, backup recommended" : "No business data yet";
  els.backupStatus.classList.toggle("ready", Boolean(state.sales.length || state.customers.length));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  navigator.serviceWorker.register("./service-worker.js").then(updateInstallReadiness).catch(() => {});
}

function friendlyAuthError(error) {
  const message = String(error?.message || error || "Account access failed.");
  if (/invalid login credentials/i.test(message)) return "No matching account was found. Choose Create account first, or check your email and password.";
  if (/email not confirmed/i.test(message)) return "Confirm your email before signing in. You can resend the confirmation below.";
  if (/user already registered/i.test(message)) return "An account already exists for this email. Switch to Sign in or reset the password.";
  if (/password/i.test(message) && /least|short|characters/i.test(message)) return "Use a password with at least 8 characters.";
  return message;
}

function renderAuthMode() {
  const signingUp = authMode === "signup";
  els.signInMode.classList.toggle("active", !signingUp);
  els.createAccount.classList.toggle("active", signingUp);
  els.signInMode.setAttribute("aria-selected", String(!signingUp));
  els.createAccount.setAttribute("aria-selected", String(signingUp));
  els.loginConfirmWrap.classList.toggle("hidden", !signingUp);
  els.loginConfirmPassword.required = signingUp;
  els.loginPassword.minLength = signingUp ? 8 : 1;
  els.resetPassword.classList.toggle("hidden", signingUp);
  els.resendConfirmation.classList.add("hidden");
  els.authHelpActions.classList.add("hidden");
  els.authFormTitle.textContent = signingUp ? "Create your business account" : "Welcome back";
  els.authFormCopy.textContent = signingUp
    ? "Start a secure 14-day trial with a clean business workspace."
    : "Enter the account you created for this business.";
  els.authSubmit.textContent = signingUp ? "Create secure account" : "Sign in securely";
  els.cloudAuthStatus.textContent = signingUp
    ? "You may need to confirm your email before the first sign-in."
    : "Enter your registered account, or choose Create account if this is your first visit.";
}

function enterWorkspace(identity) {
  state.cloud = { ...state.cloud, enabled: false, workspaceId: "", syncStatus: "local", error: "" };
  state.session = {
    loggedIn: true,
    identity: identity || "demo@ledgerlite.local"
  };
  saveState();
  renderAll();
}

function applyCloudBootstrap(result) {
  const remoteSubscription = result.subscription || {};
  const remoteData = result.data || {};
  const baseState = result.created || (!result.data && result.version === 0) ? freshCloudWorkspaceState() : state;
  state = normalizeState({
    ...baseState,
    ...remoteData,
    session: { loggedIn: true, identity: result.user?.email || "" },
    cloud: { enabled: true, workspaceId: result.workspaceId, syncStatus: "synced", lastSyncedAt: new Date().toISOString(), error: "" },
    subscription: {
      ...state.subscription,
      plan: remoteSubscription.plan || state.subscription.plan,
      cycle: remoteSubscription.cycle || state.subscription.cycle,
      status: remoteSubscription.status || state.subscription.status,
      trialEndsAt: remoteSubscription.trial_ends_at || "",
      renewalDate: remoteSubscription.current_period_ends_at || "",
      paymentMethod: remoteSubscription.payment_method || state.subscription.paymentMethod
    }
  });
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderAll();
  refreshCloudHealth();
}

async function initializeCloud() {
  if (!window.LedgerCloud?.configured) {
    els.cloudAuthStatus.textContent = "Cloud project pending. Demo mode remains available on this device.";
    return;
  }
  els.cloudAuthStatus.textContent = "Connecting to secure cloud accounts...";
  try {
    const result = await window.LedgerCloud.bootstrap(state);
    if (result.authenticated) {
      applyCloudBootstrap(result);
      els.cloudAuthStatus.textContent = "Secure cloud workspace connected.";
    } else {
      state.session.loggedIn = false;
      state.cloud = { ...state.cloud, enabled: false, syncStatus: "sign_in_required" };
      localStorage.setItem(storageKey, JSON.stringify(state));
      renderAll();
      els.cloudAuthStatus.textContent = "Sign in or create a secure business account.";
    }
  } catch (error) {
    state.cloud = { ...state.cloud, enabled: false, syncStatus: "error", error: error.message };
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderAll();
    els.cloudAuthStatus.textContent = `Cloud connection needs attention: ${error.message}`;
  }
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.LedgerCloud?.configured) {
    enterWorkspace(els.loginIdentity.value.trim());
    return;
  }
  const email = els.loginIdentity.value.trim();
  const password = els.loginPassword.value;
  if (authMode === "signup" && password !== els.loginConfirmPassword.value) {
    els.cloudAuthStatus.textContent = "The two passwords do not match.";
    els.loginConfirmPassword.focus();
    return;
  }
  els.cloudAuthStatus.textContent = authMode === "signup" ? "Creating your secure account..." : "Signing in securely...";
  els.authSubmit.disabled = true;
  try {
    if (authMode === "signup") {
      const registration = await window.LedgerCloud.signUp(email, password);
      if (registration.user && Array.isArray(registration.user.identities) && registration.user.identities.length === 0) {
        localStorage.setItem("ledgerlite-account-created", "true");
        authMode = "signin";
        renderAuthMode();
        els.cloudAuthStatus.textContent = "An account already exists for this email. Sign in or reset the password.";
        els.authHelpActions.classList.remove("hidden");
        return;
      }
      localStorage.setItem("ledgerlite-account-created", "true");
      if (!registration.session) {
        authMode = "signin";
        renderAuthMode();
        els.cloudAuthStatus.textContent = "Account created. Check your email, confirm it, then return here to sign in.";
        els.resendConfirmation.classList.remove("hidden");
        return;
      }
    } else {
      await window.LedgerCloud.signIn(email, password);
      localStorage.setItem("ledgerlite-account-created", "true");
    }
    const result = await window.LedgerCloud.bootstrap(state);
    applyCloudBootstrap(result);
    els.loginPassword.value = "";
    els.loginConfirmPassword.value = "";
  } catch (error) {
    els.cloudAuthStatus.textContent = friendlyAuthError(error);
    if (/email not confirmed/i.test(String(error?.message || ""))) els.resendConfirmation.classList.remove("hidden");
    if (/invalid login credentials/i.test(String(error?.message || ""))) els.authHelpActions.classList.remove("hidden");
  } finally {
    els.authSubmit.disabled = false;
  }
});

els.signInMode.addEventListener("click", () => {
  authMode = "signin";
  renderAuthMode();
});

els.createAccount.addEventListener("click", () => {
  authMode = "signup";
  renderAuthMode();
});

els.authCreateHelp.addEventListener("click", () => {
  authMode = "signup";
  renderAuthMode();
  els.loginPassword.focus();
});

els.authResetHelp.addEventListener("click", () => els.resetPassword.click());

els.resetPassword.addEventListener("click", async () => {
  if (!window.LedgerCloud?.configured) return alert("Cloud accounts are not configured yet.");
  if (!els.loginIdentity.checkValidity()) return alert("Enter your email address first.");
  try {
    await window.LedgerCloud.resetPassword(els.loginIdentity.value.trim());
    els.cloudAuthStatus.textContent = "Password reset email sent.";
  } catch (error) {
    els.cloudAuthStatus.textContent = error.message;
  }
});

els.resendConfirmation.addEventListener("click", async () => {
  if (!els.loginIdentity.checkValidity()) return alert("Enter the email address used to create the account.");
  try {
    await window.LedgerCloud.resendConfirmation(els.loginIdentity.value.trim());
    els.cloudAuthStatus.textContent = "A new confirmation email has been sent.";
  } catch (error) {
    els.cloudAuthStatus.textContent = friendlyAuthError(error);
  }
});

els.demoLogin.addEventListener("click", () => {
  state = structuredClone(seedData);
  state.business = { ...state.business, isSetup: true, name: "Sunrise Demo Store" };
  state.session = { loggedIn: true, identity: "demo@ledgerlite.local" };
  state.cloud = { ...state.cloud, enabled: false, workspaceId: "", syncStatus: "local", error: "" };
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderAll();
  showView("dashboard");
});

els.setupBusinessType.addEventListener("change", () => {
  toggleOtherBusinessType(els.setupBusinessType, els.setupBusinessTypeOtherWrap);
  renderSetupWizard();
});

els.setupNext.addEventListener("click", () => {
  if (!validateSetupStep()) return;
  setupStep = Math.min(4, setupStep + 1);
  renderSetupWizard();
});

els.setupBack.addEventListener("click", () => {
  setupStep = Math.max(1, setupStep - 1);
  renderSetupWizard();
});

els.businessType.addEventListener("change", () => {
  toggleOtherBusinessType(els.businessType, els.businessTypeOtherWrap);
  state.business.type = typedBusinessType(els.businessType, els.businessTypeOther);
  renderBusinessProfile();
});

els.businessTypeOther.addEventListener("input", () => {
  if (els.businessType.value === "Other") {
    state.business.type = typedBusinessType(els.businessType, els.businessTypeOther);
    renderBusinessProfile();
  }
});

els.applyPreset.addEventListener("click", addPresetItems);
els.applyPresetSettings.addEventListener("click", addPresetItems);

els.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (setupStep !== 4 || !validateSetupStep()) return;
  const payments = setupPaymentMethods();
  const startMode = els.setupStartModes.find((option) => option.checked)?.value || "blank";
  state.business = {
    ...state.business,
    isSetup: true,
    name: els.setupBusinessName.value.trim(),
    type: typedBusinessType(els.setupBusinessType, els.setupBusinessTypeOther),
    phone: els.setupBusinessPhone.value.trim(),
    location: els.setupBusinessLocation.value.trim(),
    currency: els.setupBusinessCurrency.value,
    payments: payments.join(", ")
  };
  state.customers = [];
  state.items = [];
  state.sales = [];
  state.payments = [];
  state.expenses = [];
  state.quotes = [];
  state.recurringContracts = [];
  state.reminders = [];
  if (startMode === "starter") {
    const preset = getBusinessPreset();
    state.items = preset.items.map((item) => ({
      id: createId("i"), name: item.name, price: item.price, stock: item.stock, isService: Boolean(item.isService)
    }));
  }
  saveState();
  if (state.cloud.enabled) window.LedgerCloud.updateWorkspace(state).catch((error) => alert(error.message));
  setupStep = 1;
  renderAll();
  showView("dashboard");
});

els.businessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.business = {
    ...state.business,
    isSetup: true,
    name: els.businessName.value.trim(),
    type: typedBusinessType(els.businessType, els.businessTypeOther),
    phone: els.businessPhone.value.trim(),
    location: els.businessLocation.value.trim(),
    currency: els.businessCurrency.value,
    payments: els.businessPayments.value.trim()
  };
  saveState();
  if (state.cloud.enabled) window.LedgerCloud.updateWorkspace(state).catch((error) => alert(error.message));
  renderAll();
});

els.staffForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.cloud.enabled && !els.staffEmail.value.trim()) {
    alert("Enter the staff member's email so LedgerLite can send a secure invitation.");
    return;
  }
  if (state.cloud.enabled) {
    try {
      await window.LedgerCloud.inviteStaff(els.staffEmail.value.trim(), els.staffRole.value.toLowerCase());
    } catch (error) {
      alert(`Invitation could not be sent: ${error.message}`);
      return;
    }
  }
  state.staff.push({
    id: createId("u"),
    name: els.staffName.value.trim(),
    email: els.staffEmail.value.trim(),
    role: els.staffRole.value
  });
  saveState();
  els.staffForm.reset();
  renderAll();
});

els.billingCycleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.subscription.cycle = button.dataset.billingCycle;
    saveState();
    renderBilling();
  });
});

els.billingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.subscription.pendingPlan) {
    alert("Choose a plan before requesting activation.");
    return;
  }
  try {
    if (state.cloud.enabled) {
      await window.LedgerCloud.requestPlan(state.subscription.pendingPlan, state.subscription.cycle, els.billingPaymentMethod.value);
    }
    state.subscription.status = "pending";
    state.subscription.paymentMethod = els.billingPaymentMethod.value;
    state.subscription.billingContact = els.billingContact.value.trim();
    saveState();
    renderBilling();
    alert("Activation request saved. Danova Technologies must verify payment before the plan becomes active.");
  } catch (error) {
    alert(`Activation request failed: ${error.message}`);
  }
});

els.logout.addEventListener("click", async () => {
  if (state.cloud.enabled) await window.LedgerCloud.signOut().catch(() => {});
  state.session.loggedIn = false;
  state.cloud = { ...state.cloud, enabled: false, workspaceId: "", syncStatus: "signed_out" };
  saveState();
  renderAll();
});

els.navItems.forEach((item) => item.addEventListener("click", () => {
  showView(item.dataset.view);
  if (item.dataset.view === "cloud-status") refreshCloudHealth();
}));
document.querySelectorAll("[data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.viewJump));
});

els.globalSearch.addEventListener("input", renderGlobalSearch);
els.globalSearch.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    els.globalSearch.value = "";
    els.globalSearchResults.classList.add("hidden");
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".global-search")) {
    els.globalSearchResults.classList.add("hidden");
  }
});

els.copyDailyClose.addEventListener("click", async () => {
  await copyText(dailyCloseText());
  alert("Daily close summary copied.");
});

els.installApp.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallReadiness();
});

els.backupNow.addEventListener("click", () => {
  downloadTextFile(`ledgerlite-backup-${Date.now()}.json`, JSON.stringify(backupPayload(), null, 2), "application/json");
});

document.querySelectorAll("[data-copy-script]").forEach((button) => {
  button.addEventListener("click", async () => {
    await copyText(outreachScriptText(button.dataset.copyScript));
    alert("Outreach message copied.");
  });
});

[
  els.customerSearch,
  els.customerFilter,
  els.inventorySearch,
  els.inventoryFilter,
  els.expenseSearch,
  els.expenseFilter,
  els.activitySearch,
  els.activityFilter,
  els.leadSearch,
  els.leadFilter
].forEach((field) => {
  field.addEventListener("input", renderAll);
  field.addEventListener("change", renderAll);
});

["change", "input"].forEach((eventName) => {
  [els.saleCustomer, els.manualCustomer, els.saleItem, els.manualItem, els.manualItemPrice, els.saleQuantity, els.saleCurrency, els.paymentMethod, els.amountPaid, els.saleNotes].forEach(
    (field) => field.addEventListener(eventName, () => renderReceipt(null))
  );
  [
    els.quoteCustomer,
    els.quoteManualCustomer,
    els.quoteItem,
    els.quoteManualItem,
    els.quoteManualPrice,
    els.quoteQuantity,
    els.quoteCurrency,
    els.quoteValidDays,
    els.quoteNotes
  ].forEach((field) => field.addEventListener(eventName, () => renderQuotePreview(null)));
});

els.addSaleLine.addEventListener("click", () => addDraftLine("sale"));
els.addQuoteLine.addEventListener("click", () => addDraftLine("quote"));
els.saleDraftLines.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-sale-line]");
  if (!button) return;
  saleDraftLines = saleDraftLines.filter((line) => line.id !== button.dataset.removeSaleLine);
  renderDraftLines("sale");
  renderReceipt(null);
});
els.quoteDraftLines.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-quote-line]");
  if (!button) return;
  quoteDraftLines = quoteDraftLines.filter((line) => line.id !== button.dataset.removeQuoteLine);
  renderDraftLines("quote");
  renderQuotePreview(null);
});
els.saleCurrency.addEventListener("change", () => renderDraftLines("sale"));
els.quoteCurrency.addEventListener("change", () => renderDraftLines("quote"));

els.saleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const manualCustomerName = els.manualCustomer.value.trim();
  let customer = manualCustomerName
    ? state.customers.find((entry) => entry.name.toLowerCase() === manualCustomerName.toLowerCase())
    : findCustomer(els.saleCustomer.value);

  if (!customer && !manualCustomerName) {
    alert("Choose a customer or type a new customer name.");
    return;
  }
  if (!saleDraftLines.length) {
    alert("Add at least one item to the sale.");
    return;
  }
  const total = saleDraftLines.reduce((sum, line) => sum + line.amount, 0);
  const paid = Number(els.amountPaid.value || 0);
  if (paid < 0 || paid > total) {
    alert("Amount paid must be between zero and the sale total.");
    return;
  }
  const unavailable = saleDraftLines.find((line) => {
    const item = findItem(line.itemId);
    if (!item || item.isService) return false;
    const required = saleDraftLines.filter((entry) => entry.itemId === item.id).reduce((sum, entry) => sum + entry.quantity, 0);
    return required > Number(item.stock || 0);
  });
  if (unavailable) {
    alert(`There is not enough ${unavailable.name} in stock to save this sale.`);
    return;
  }
  if (!customer) {
    customer = { id: createId("c"), name: manualCustomerName, phone: "", balance: 0 };
    state.customers.push(customer);
  }
  const lines = saleDraftLines.map((line) => {
    let item = findItem(line.itemId) || state.items.find((entry) => entry.name.toLowerCase() === line.name.toLowerCase());
    if (!item) {
      item = { id: createId("i"), name: line.name, price: line.unitPrice, stock: 0, isService: true };
      state.items.push(item);
    }
    return { ...line, itemId: item.id, isService: Boolean(item.isService) };
  });
  const balance = Math.max(total - paid, 0);
  const sale = {
    id: createId("s"),
    receipt: `DL-${state.receiptCounter}`,
    customerId: customer.id,
    itemId: lines[0].itemId,
    manualCustomerName: customer.name,
    manualItemName: lines[0].name,
    quantity: lines[0].quantity,
    lines,
    currency: els.saleCurrency.value,
    method: els.paymentMethod.value,
    total,
    paid,
    balance,
    notes: els.saleNotes.value.trim(),
    createdAt: new Date().toISOString()
  };

  lines.forEach((line) => {
    const item = findItem(line.itemId);
    if (item && !item.isService) item.stock = Math.max(Number(item.stock || 0) - line.quantity, 0);
  });
  if (customer) customer.balance = Number((customer.balance + balance).toFixed(2));
  state.sales.push(sale);
  state.receiptCounter += 1;
  lastReceipt = sale;
  saleDraftLines = [];
  saveState();
  els.saleForm.reset();
  els.saleQuantity.value = 1;
  els.saleCurrency.value = state.business.currency || "USD";
  renderAll();
  renderDraftLines("sale");
});

els.quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const manualCustomerName = els.quoteManualCustomer.value.trim();
  let customer = manualCustomerName
    ? state.customers.find((entry) => entry.name.toLowerCase() === manualCustomerName.toLowerCase())
    : findCustomer(els.quoteCustomer.value);

  if (!customer && !manualCustomerName) {
    alert("Choose a customer or type a new customer name.");
    return;
  }

  if (!quoteDraftLines.length) {
    alert("Add at least one item to the quote.");
    return;
  }
  if (!customer) {
    customer = { id: createId("c"), name: manualCustomerName, phone: "", balance: 0 };
    state.customers.push(customer);
  }
  const lines = quoteDraftLines.map((line) => {
    let item = findItem(line.itemId) || state.items.find((entry) => entry.name.toLowerCase() === line.name.toLowerCase());
    if (!item) {
      item = { id: createId("i"), name: line.name, price: line.unitPrice, stock: 0, isService: true };
      state.items.push(item);
    }
    return { ...line, itemId: item.id, isService: Boolean(item.isService) };
  });
  const createdAt = new Date();
  const validUntil = new Date(createdAt);
  validUntil.setDate(validUntil.getDate() + Number(els.quoteValidDays.value || 7));
  const quote = {
    id: createId("q"),
    quoteNumber: `QT-${state.quoteCounter}`,
    customerId: customer.id,
    itemId: lines[0].itemId,
    manualCustomerName: customer.name,
    manualItemName: lines[0].name,
    quantity: lines[0].quantity,
    lines,
    currency: els.quoteCurrency.value,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    status: "Open",
    notes: els.quoteNotes.value.trim(),
    createdAt: createdAt.toISOString(),
    validUntil: validUntil.toISOString()
  };

  state.quotes.push(quote);
  state.quoteCounter += 1;
  lastQuote = quote;
  quoteDraftLines = [];
  saveState();
  els.quoteForm.reset();
  els.quoteQuantity.value = 1;
  els.quoteCurrency.value = state.business.currency || "USD";
  renderAll();
  renderDraftLines("quote");
});

els.paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const customer = findCustomer(els.paymentCustomer.value);
  if (!customer) {
    alert("Choose a customer before saving payment.");
    return;
  }

  const amount = Number(els.paymentAmount.value || 0);
  if (amount <= 0) {
    alert("Enter an amount received.");
    return;
  }

  const payment = {
    id: createId("p"),
    customerId: customer.id,
    customerName: customer.name,
    amount,
    currency: els.paymentCurrency.value,
    method: els.paymentMethodCollect.value,
    note: els.paymentNote.value.trim(),
    createdAt: new Date().toISOString()
  };

  customer.balance = Math.max(Number((customer.balance - amount).toFixed(2)), 0);
  state.payments.push(payment);
  saveState();
  els.paymentForm.reset();
  els.paymentCurrency.value = state.business.currency || "USD";
  renderAll();
});

els.expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(els.expenseAmount.value || 0);
  if (amount <= 0) {
    alert("Enter an expense amount.");
    return;
  }

  state.expenses.push({
    id: createId("e"),
    category: els.expenseCategory.value,
    amount,
    currency: els.expenseCurrency.value,
    method: els.expenseMethod.value,
    description: els.expenseDescription.value.trim(),
    createdAt: new Date().toISOString()
  });
  saveState();
  els.expenseForm.reset();
  els.expenseCurrency.value = state.business.currency || "USD";
  renderAll();
});

els.leadForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.leads.push({
    id: createId("l"),
    business: els.leadBusiness.value.trim(),
    contact: els.leadContact.value.trim(),
    type: els.leadType.value,
    status: els.leadStatus.value,
    nextAction: els.leadNextAction.value,
    dueDate: els.leadDueDate.value || dateInputValue(1),
    notes: els.leadNotes.value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  saveState();
  els.leadForm.reset();
  els.leadDueDate.value = dateInputValue(1);
  renderAll();
});

els.customerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.customers.push({
    id: createId("c"),
    name: els.customerName.value.trim(),
    phone: els.customerPhone.value.trim(),
    balance: 0
  });
  saveState();
  els.customerForm.reset();
  renderAll();
});

els.recurringForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const customer = findCustomer(els.recurringCustomer.value);
  if (!customer) {
    alert("Add a customer before creating a monthly agreement.");
    return;
  }
  if (!customer.phone) {
    alert("This customer needs a WhatsApp number before reminders can be scheduled.");
    return;
  }
  state.recurringContracts.push({
    id: createId("rc"),
    customerId: customer.id,
    service: els.recurringService.value.trim(),
    amount: Number(els.recurringAmount.value),
    currency: els.recurringCurrency.value,
    billingDay: Number(els.recurringBillingDay.value),
    leadDays: Number(els.recurringLeadDays.value),
    consentAt: new Date().toISOString(),
    status: "active",
    createdAt: new Date().toISOString()
  });
  saveState();
  els.recurringForm.reset();
  els.recurringLeadDays.value = "3";
  els.recurringCurrency.value = state.business.currency || "USD";
  renderAll();
});

els.reminderFilter.addEventListener("change", renderRecurringBilling);

els.notificationFilter.addEventListener("change", renderBusinessNotifications);

els.markNotificationsRead.addEventListener("click", () => {
  state.notificationSettings.reviewedAt = new Date().toISOString();
  state.notificationSettings.reviewedAlertIds = businessNotifications().map((alert) => alert.id);
  saveState();
  renderBusinessNotifications();
});

els.enableBrowserNotifications.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Device notifications are not supported by this browser.");
    return;
  }
  if (Notification.permission === "granted" && state.notificationSettings.deviceEnabled) {
    state.notificationSettings.deviceEnabled = false;
    saveState();
    renderBusinessNotifications();
    return;
  }
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  state.notificationSettings.deviceEnabled = permission === "granted";
  saveState();
  renderBusinessNotifications();
  if (permission === "granted") notifyBusinessForReadyReminders();
});

els.itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.items.push({
    id: createId("i"),
    name: els.itemName.value.trim(),
    price: Number(els.itemPrice.value || 0),
    stock: Number(els.itemStock.value || 0)
  });
  saveState();
  els.itemForm.reset();
  renderAll();
});

els.copyReceipt.addEventListener("click", async () => {
  const text = receiptText(lastReceipt);
  if (!text) {
    alert("Save a sale first, then copy the receipt.");
    return;
  }
  await copyText(text);
  alert("Receipt copied.");
});

els.whatsappReceipt.addEventListener("click", () => {
  const text = receiptText(lastReceipt);
  if (!text) {
    alert("Save a sale first, then send the receipt.");
    return;
  }
  const details = receiptDetails(lastReceipt);
  window.open(whatsappUrl(details.customerPhone, text), "_blank", "noopener");
});

els.printReceipt.addEventListener("click", () => window.print());

els.copyQuote.addEventListener("click", async () => {
  const text = quoteText(lastQuote);
  if (!text) {
    alert("Save a quote first, then copy it.");
    return;
  }
  await copyText(text);
  alert("Quote copied.");
});

els.whatsappQuote.addEventListener("click", () => {
  const text = quoteText(lastQuote);
  if (!text) {
    alert("Save a quote first, then send it.");
    return;
  }
  const details = quoteDetails(lastQuote);
  window.open(whatsappUrl(details.customerPhone, text), "_blank", "noopener");
});

els.printQuote.addEventListener("click", () => window.print());

els.importCustomersBtn.addEventListener("click", () => els.importCustomersFile.click());
els.importCustomersBtnReports.addEventListener("click", () => els.importCustomersFile.click());
els.importItemsBtn.addEventListener("click", () => els.importItemsFile.click());
els.importItemsBtnReports.addEventListener("click", () => els.importItemsFile.click());
els.importExpensesBtn.addEventListener("click", () => els.importExpensesFile.click());
els.importExpensesBtnReports.addEventListener("click", () => els.importExpensesFile.click());
els.importLeadsBtn.addEventListener("click", () => els.importLeadsFile.click());

els.downloadCustomersTemplate.addEventListener("click", () => {
  downloadTextFile("ledgerlite-customers-template.csv", toCsv(["name", "phone", "balance"], [["Example Customer", "+263771234567", "0"]]));
});

els.downloadItemsTemplate.addEventListener("click", () => {
  downloadTextFile("ledgerlite-inventory-template.csv", toCsv(["name", "price", "stock", "isService"], [["Example Product", "10", "5", "false"]]));
});

els.downloadExpensesTemplate.addEventListener("click", () => {
  downloadTextFile("ledgerlite-expenses-template.csv", toCsv(["date", "category", "amount", "currency", "method", "description"], [["16 Jun 2026", "Transport", "5", "USD", "Cash", "Delivery"]]));
});

els.downloadLeadsTemplate.addEventListener("click", () => {
  downloadTextFile(
    "ledgerlite-leads-template.csv",
    toCsv(
      ["business", "contact", "type", "status", "nextAction", "dueDate", "notes"],
      [["Example Shop", "+263771234567", "Retail shop", "New lead", "Send opener", dateInputValue(1), "Uses manual books"]]
    )
  );
});

els.importCustomersFile.addEventListener("change", () => {
  readCsvFile(els.importCustomersFile, (rows) => {
    let imported = 0;
    rows.forEach((row) => {
      const name = firstValue(row, ["name", "customer", "client", "member", "tenant", "patient", "buyer"]);
      if (!name) return;
      const phone = firstValue(row, ["phone", "mobile", "whatsapp", "number"]);
      const balance = Number(firstValue(row, ["balance", "outstanding", "amount owed"], "0")) || 0;
      const exists = state.customers.some((customer) => customer.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        state.customers.push({ id: createId("c"), name, phone, balance });
        imported += 1;
      }
    });
    saveState();
    renderAll();
    alert(`Imported ${imported} customers.`);
  });
});

els.importItemsFile.addEventListener("change", () => {
  readCsvFile(els.importItemsFile, (rows) => {
    let imported = 0;
    rows.forEach((row) => {
      const name = firstValue(row, ["name", "item", "product", "service", "fee", "produce"]);
      if (!name) return;
      const price = Number(firstValue(row, ["price", "amount", "rate"], "0")) || 0;
      const stock = Number(firstValue(row, ["stock", "quantity", "qty"], "0")) || 0;
      const isServiceText = firstValue(row, ["isservice", "service", "is service"], "").toLowerCase();
      const isService = ["true", "yes", "1", "service"].includes(isServiceText);
      const exists = state.items.some((item) => item.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        state.items.push({ id: createId("i"), name, price, stock, isService });
        imported += 1;
      }
    });
    saveState();
    renderAll();
    alert(`Imported ${imported} inventory items/services.`);
  });
});

els.importExpensesFile.addEventListener("change", () => {
  readCsvFile(els.importExpensesFile, (rows) => {
    let imported = 0;
    rows.forEach((row) => {
      const amount = Number(firstValue(row, ["amount", "cost", "total"], "0")) || 0;
      if (amount <= 0) return;
      state.expenses.push({
        id: createId("e"),
        category: firstValue(row, ["category", "type"], "Other"),
        amount,
        currency: firstValue(row, ["currency"], state.business.currency || "USD"),
        method: firstValue(row, ["method", "paid by", "payment method"], "Cash"),
        description: firstValue(row, ["description", "note", "notes"], ""),
        createdAt: safeDateIso(firstValue(row, ["date", "createdat", "created at"], ""))
      });
      imported += 1;
    });
    saveState();
    renderAll();
    alert(`Imported ${imported} expenses.`);
  });
});

els.importLeadsFile.addEventListener("change", () => {
  readCsvFile(els.importLeadsFile, (rows) => {
    let imported = 0;
    rows.forEach((row) => {
      const business = firstValue(row, ["business", "business name", "name", "company", "shop"]);
      if (!business) return;
      const exists = state.leads.some((lead) => lead.business.toLowerCase() === business.toLowerCase());
      if (exists) return;
      state.leads.push({
        id: createId("l"),
        business,
        contact: firstValue(row, ["contact", "phone", "mobile", "whatsapp", "owner"], ""),
        type: firstValue(row, ["type", "business type", "sector"], "Retail shop"),
        status: firstValue(row, ["status", "stage"], "New lead"),
        nextAction: firstValue(row, ["nextaction", "next action", "action", "follow up action"], "Send opener"),
        dueDate: firstValue(row, ["duedate", "due date", "followup", "follow-up", "follow up date"], dateInputValue(1)),
        notes: firstValue(row, ["notes", "note", "pain point"], ""),
        createdAt: safeDateIso(firstValue(row, ["date", "createdat", "created at"], "")),
        updatedAt: new Date().toISOString()
      });
      imported += 1;
    });
    saveState();
    renderAll();
    alert(`Imported ${imported} leads.`);
  });
});

els.exportSalesCsv.addEventListener("click", () => {
  const rows = state.sales.map((sale) => {
    const customer = findCustomer(sale.customerId);
    const item = findItem(sale.itemId);
    return [
      sale.receipt,
      todayStamp(sale.createdAt),
      customer?.name || sale.manualCustomerName || "Walk-in",
      item?.name || sale.manualItemName || "Item",
      sale.quantity,
      sale.currency,
      sale.method,
      sale.total,
      sale.paid,
      sale.balance,
      sale.notes || ""
    ];
  });
  downloadTextFile(
    "ledgerlite-sales.csv",
    toCsv(["Receipt", "Date", "Customer", "Item", "Quantity", "Currency", "Method", "Total", "Paid", "Balance", "Notes"], rows)
  );
});

els.exportCustomersCsv.addEventListener("click", () => {
  const rows = state.customers.map((customer) => [customer.name, customer.phone || "", customer.balance || 0]);
  downloadTextFile("ledgerlite-customers.csv", toCsv(["Customer", "Phone", "Balance"], rows));
});

els.exportExpensesCsv.addEventListener("click", () => {
  const rows = state.expenses.map((expense) => [
    todayStamp(expense.createdAt),
    expense.category,
    expense.amount,
    expense.currency,
    expense.method,
    expense.description || ""
  ]);
  downloadTextFile("ledgerlite-expenses.csv", toCsv(["Date", "Category", "Amount", "Currency", "Method", "Description"], rows));
});

els.exportLeadsCsv.addEventListener("click", () => {
  const rows = state.leads.map((lead) => [
    todayStamp(lead.createdAt),
    lead.business,
    lead.contact || "",
    lead.type,
    lead.status,
    lead.nextAction || "",
    lead.dueDate || "",
    lead.notes || ""
  ]);
  downloadTextFile("ledgerlite-leads.csv", toCsv(["Date", "Business", "Contact", "Type", "Status", "Next Action", "Due Date", "Notes"], rows));
});

els.exportData.addEventListener("click", () => {
  downloadTextFile("ledgerlite-export.json", JSON.stringify(state, null, 2), "application/json");
});

els.backupData.addEventListener("click", () => {
  const businessSlug = currentBusinessName().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business";
  downloadTextFile(`ledgerlite-backup-${businessSlug}.json`, JSON.stringify(backupPayload(), null, 2), "application/json");
});

els.restoreDataBtn.addEventListener("click", () => els.restoreDataFile.click());

els.restoreDataFile.addEventListener("change", () => {
  const file = els.restoreDataFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      if (!confirm("Restore this backup? Current local records will be replaced.")) return;
      restoreStateFromBackup(parsed);
      alert("Backup restored.");
    } catch {
      alert("That backup file could not be read. Please choose a valid LedgerLite JSON backup.");
    } finally {
      els.restoreDataFile.value = "";
    }
  };
  reader.readAsText(file);
});

els.clearData.addEventListener("click", () => {
  if (!confirm("Clear all LedgerLite data on this device? This cannot be undone unless you have a backup.")) return;
  localStorage.removeItem(storageKey);
  state = structuredClone(seedData);
  selectedCustomerId = null;
  lastReceipt = null;
  lastQuote = null;
  renderAll();
  showView("dashboard");
});

els.cloudExportData.addEventListener("click", async () => {
  try {
    const exported = await window.LedgerCloud.privacyAction("export");
    downloadTextFile(`ledgerlite-cloud-export-${Date.now()}.json`, JSON.stringify(exported, null, 2), "application/json");
  } catch (error) {
    alert(`Cloud export failed: ${error.message}`);
  }
});

els.requestWorkspaceDeletion.addEventListener("click", async () => {
  if (!confirm("Request deletion of this cloud workspace? Sending will stop and the workspace will enter a protected deletion review.")) return;
  try {
    await window.LedgerCloud.privacyAction("delete_workspace");
    alert("Workspace deletion request submitted. The cloud workspace is now protected from further messaging.");
    await window.LedgerCloud.signOut();
    state.session.loggedIn = false;
    state.cloud.enabled = false;
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderAll();
  } catch (error) {
    alert(`Deletion request failed: ${error.message}`);
  }
});

els.refreshCloudHealth.addEventListener("click", refreshCloudHealth);

els.resetDemo.addEventListener("click", () => {
  if (!confirm("Reset demo data? This replaces current local records with sample data.")) return;
  state = structuredClone(seedData);
  selectedCustomerId = null;
  lastReceipt = null;
  lastQuote = null;
  saveState();
  renderAll();
  showView("dashboard");
});

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallReadiness();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallReadiness();
});
window.addEventListener("ledgerlite:cloud-synced", () => {
  state.cloud.syncStatus = "synced";
  state.cloud.lastSyncedAt = new Date().toISOString();
  state.cloud.error = "";
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderAccessState();
  if (document.querySelector("#cloud-status")?.classList.contains("active-view")) refreshCloudHealth();
});
window.addEventListener("ledgerlite:cloud-conflict", (event) => {
  const changedAt = event.detail?.remoteUpdatedAt ? new Date(event.detail.remoteUpdatedAt).toLocaleString() : "recently";
  state.cloud.syncStatus = "conflict";
  state.cloud.error = "Another device changed this business.";
  els.cloudConflictCopy.textContent = `Another device saved changes ${changedAt}. Choose which copy LedgerLite should keep.`;
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderAccessState();
});
window.addEventListener("ledgerlite:cloud-error", (event) => {
  state.cloud.syncStatus = "error";
  state.cloud.error = event.detail || "Cloud sync failed";
  localStorage.setItem(storageKey, JSON.stringify(state));
  renderAccessState();
});

els.useCloudVersion.addEventListener("click", async () => {
  try {
    const result = await window.LedgerCloud.resolveConflict("cloud", state);
    applyCloudBootstrap({ ...result, user: window.LedgerCloud.user, workspaceId: window.LedgerCloud.workspaceId, created: false });
  } catch (error) {
    state.cloud.syncStatus = "error";
    state.cloud.error = error.message;
    renderAccessState();
  }
});

els.keepDeviceVersion.addEventListener("click", async () => {
  if (!window.confirm("Keep this device's records and replace the newer cloud copy?")) return;
  try {
    const result = await window.LedgerCloud.resolveConflict("device", state);
    if (result.conflict) return;
    state.cloud.syncStatus = "synced";
    state.cloud.error = "";
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderAccessState();
  } catch (error) {
    state.cloud.syncStatus = "error";
    state.cloud.error = error.message;
    renderAccessState();
  }
});

updateConnectionStatus();
updateInstallReadiness();
els.leadDueDate.value = dateInputValue(1);
registerServiceWorker();
renderAll();
renderAuthMode();
initializeCloud();
