const STORAGE_KEY = "monthly-spending-app:v1";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.SPENDING_APP_CONFIG || {};
const hasCloudConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey);

const categories = [
  "Groceries",
  "Dining",
  "Transport",
  "Home",
  "Health",
  "Shopping",
  "Subscriptions",
  "Travel",
  "Other",
];

const state = {
  expenses: [],
  budget: 2500,
  selectedMonth: toMonthValue(new Date()),
  user: null,
  cloud: null,
  storageMode: hasCloudConfig ? "cloud" : "local",
};

const els = {
  authPanel: document.querySelector("#authPanel"),
  authForm: document.querySelector("#authForm"),
  codeForm: document.querySelector("#codeForm"),
  authEmail: document.querySelector("#authEmail"),
  authCode: document.querySelector("#authCode"),
  authMessage: document.querySelector("#authMessage"),
  signOut: document.querySelector("#signOut"),
  appContent: document.querySelector("#appContent"),
  storageStatus: document.querySelector("#storageStatus"),
  selectedMonth: document.querySelector("#selectedMonth"),
  previousMonth: document.querySelector("#previousMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseDate: document.querySelector("#expenseDate"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseCategory: document.querySelector("#expenseCategory"),
  expenseNote: document.querySelector("#expenseNote"),
  monthlyBudget: document.querySelector("#monthlyBudget"),
  totalSpent: document.querySelector("#totalSpent"),
  transactionCount: document.querySelector("#transactionCount"),
  budgetStatus: document.querySelector("#budgetStatus"),
  budgetLabel: document.querySelector("#budgetLabel"),
  dailyAverage: document.querySelector("#dailyAverage"),
  projectedSpend: document.querySelector("#projectedSpend"),
  topCategory: document.querySelector("#topCategory"),
  topCategoryShare: document.querySelector("#topCategoryShare"),
  insightMonth: document.querySelector("#insightMonth"),
  insights: document.querySelector("#insights"),
  dailyChart: document.querySelector("#dailyChart"),
  dailyPeak: document.querySelector("#dailyPeak"),
  categoryTotal: document.querySelector("#categoryTotal"),
  categoryList: document.querySelector("#categoryList"),
  transactionList: document.querySelector("#transactionList"),
  transactionTemplate: document.querySelector("#transactionTemplate"),
  clearMonth: document.querySelector("#clearMonth"),
  seedDemo: document.querySelector("#seedDemo"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  tabs: document.querySelectorAll(".tab"),
  reportViews: document.querySelectorAll(".report-view"),
};

function toMonthValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toLocalDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0);
}

function monthName(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysInMonth(monthValue) {
