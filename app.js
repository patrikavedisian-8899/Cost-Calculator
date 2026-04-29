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
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function showMessage(message, tone = "neutral") {
  els.authMessage.textContent = message;
  els.authMessage.dataset.tone = tone;
}

function setBusy(isBusy) {
  document.body.classList.toggle("is-busy", isBusy);
}

function saveLocal() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      expenses: state.expenses,
      budget: state.budget,
      selectedMonth: state.selectedMonth,
    }),
  );
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    state.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
    state.budget = Number(parsed.budget) || 2500;
    state.selectedMonth = parsed.selectedMonth || state.selectedMonth;
  } catch {
    state.expenses = [];
  }
}

async function loadCloud() {
  if (!state.cloud || !state.user) return;

  const [{ data: expenses, error: expensesError }, { data: settings, error: settingsError }] =
    await Promise.all([
      state.cloud
        .from("expenses")
        .select("id, date, amount, category, note, created_at")
        .order("date", { ascending: false }),
      state.cloud.from("user_settings").select("monthly_budget").maybeSingle(),
    ]);

  if (expensesError) throw expensesError;
  if (settingsError) throw settingsError;

  state.expenses = expenses.map((expense) => ({
    id: expense.id,
    date: expense.date,
    amount: Number(expense.amount),
    category: expense.category,
    note: expense.note || "",
    createdAt: new Date(expense.created_at).getTime(),
  }));
  state.budget = Number(settings?.monthly_budget) || 2500;
}

async function saveBudget() {
  if (state.storageMode === "local") {
    saveLocal();
    return;
  }

  const { error } = await state.cloud.from("user_settings").upsert({
    user_id: state.user.id,
    monthly_budget: state.budget,
  });
  if (error) throw error;
}

async function addExpense(expense) {
  if (state.storageMode === "local") {
    state.expenses.push(expense);
    saveLocal();
    return;
  }

  const { data, error } = await state.cloud
    .from("expenses")
    .insert({
      user_id: state.user.id,
      date: expense.date,
      amount: expense.amount,
      category: expense.category,
      note: expense.note,
    })
    .select("id, date, amount, category, note, created_at")
    .single();

  if (error) throw error;

  state.expenses.push({
    id: data.id,
    date: data.date,
    amount: Number(data.amount),
    category: data.category,
    note: data.note || "",
    createdAt: new Date(data.created_at).getTime(),
  });
}

async function deleteExpense(id) {
  if (state.storageMode === "local") {
    state.expenses = state.expenses.filter((expense) => expense.id !== id);
    saveLocal();
    return;
  }

  const { error } = await state.cloud.from("expenses").delete().eq("id", id);
  if (error) throw error;
  state.expenses = state.expenses.filter((expense) => expense.id !== id);
}

async function deleteExpenses(ids) {
  if (state.storageMode === "local") {
    const idSet = new Set(ids);
    state.expenses = state.expenses.filter((expense) => !idSet.has(expense.id));
    saveLocal();
    return;
  }

  const { error } = await state.cloud.from("expenses").delete().in("id", ids);
  if (error) throw error;
  const idSet = new Set(ids);
  state.expenses = state.expenses.filter((expense) => !idSet.has(expense.id));
}

function monthExpenses() {
  return state.expenses
    .filter((expense) => expense.date.startsWith(state.selectedMonth))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function groupByCategory(expenses) {
  return categories
    .map((category) => ({
      category,
      total: expenses
        .filter((expense) => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0),
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

function groupByDay(expenses) {
  const days = Array.from({ length: daysInMonth(state.selectedMonth) }, (_, index) => ({
    day: index + 1,
    total: 0,
  }));

  expenses.forEach((expense) => {
    const day = parseLocalDate(expense.date).getDate();
    days[day - 1].total += expense.amount;
  });

  return days;
}

function generateInsights(expenses, categoryTotals, dayTotals, total) {
  if (!expenses.length) {
    return [
      "Add a few expenses or load demo data to see monthly insights here.",
      "Once there is data, this report will point out your biggest category, daily pace, and budget risk.",
    ];
  }

  const insights = [];
  const budgetDelta = state.budget - total;
  const top = categoryTotals[0];
  const activeDays = dayTotals.filter((day) => day.total > 0);
  const biggestDay = [...dayTotals].sort((a, b) => b.total - a.total)[0];
  const recurring = categoryTotals.find((item) => item.category === "Subscriptions");

  insights.push(
    budgetDelta >= 0
      ? `You are ${currency(budgetDelta)} under your ${currency(state.budget)} monthly budget.`
      : `You are ${currency(Math.abs(budgetDelta))} over your ${currency(state.budget)} monthly budget.`,
  );

  if (top) {
    insights.push(`${top.category} is the largest category at ${currency(top.total)}, about ${Math.round((top.total / total) * 100)}% of this month.`);
  }

  if (biggestDay.total > 0) {
    insights.push(`Your highest spending day was day ${biggestDay.day}, with ${currency(biggestDay.total)} recorded.`);
  }

  if (activeDays.length > 0) {
    insights.push(`On days when you spent money, the average was ${currency(total / activeDays.length)}.`);
  }

  if (recurring && recurring.total > total * 0.12) {
    insights.push(`Subscriptions are taking a noticeable share this month at ${currency(recurring.total)}.`);
  }

  return insights.slice(0, 5);
}

function renderSummary(expenses, categoryTotals, dayTotals, total) {
  const now = new Date();
  const isCurrentMonth = state.selectedMonth === toMonthValue(now);
  const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth(state.selectedMonth);
  const dailyAverage = total / Math.max(elapsedDays, 1);
  const projected = dailyAverage * daysInMonth(state.selectedMonth);
  const top = categoryTotals[0];
  const budgetDelta = state.budget - total;

  els.totalSpent.textContent = currency(total);
  els.transactionCount.textContent = `${expenses.length} transaction${expenses.length === 1 ? "" : "s"}`;
  els.budgetStatus.textContent =
    budgetDelta >= 0 ? `${currency(budgetDelta)} left` : `${currency(Math.abs(budgetDelta))} over`;
  els.budgetStatus.style.color = budgetDelta >= 0 ? "var(--green-dark)" : "var(--red)";
  els.budgetLabel.textContent = `Budget ${currency(state.budget)}`;
  els.dailyAverage.textContent = currency(dailyAverage);
  els.projectedSpend.textContent = `Projected ${currency(projected)}`;
  els.topCategory.textContent = top ? top.category : "None";
  els.topCategoryShare.textContent = top ? `${Math.round((top.total / total) * 100)}% of spending` : "No spending yet";

  const peak = [...dayTotals].sort((a, b) => b.total - a.total)[0];
  els.dailyPeak.textContent = peak && peak.total > 0 ? `Peak ${currency(peak.total)}` : "";
}

function renderInsights(expenses, categoryTotals, dayTotals, total) {
  els.insightMonth.textContent = monthName(state.selectedMonth);
  els.insights.innerHTML = "";

  generateInsights(expenses, categoryTotals, dayTotals, total).forEach((insight) => {
    const item = document.createElement("li");
    item.textContent = insight;
    els.insights.append(item);
  });
}

function renderDailyChart(dayTotals) {
  const max = Math.max(...dayTotals.map((day) => day.total), 1);
  els.dailyChart.style.setProperty("--days-in-month", dayTotals.length);
  els.dailyChart.innerHTML = "";

  dayTotals.forEach((day) => {
    const bar = document.createElement("div");
    const height = day.total > 0 ? Math.max((day.total / max) * 100, 4) : 2;
    bar.className = `bar${day.total === max && max > 1 ? " high" : ""}`;
    bar.style.height = `${height}%`;
    bar.dataset.label = `Day ${day.day}: ${currency(day.total)}`;
    els.dailyChart.append(bar);
  });
}

function renderCategories(categoryTotals, total) {
  els.categoryTotal.textContent = total > 0 ? currency(total) : "";
  els.categoryList.innerHTML = "";

  if (!categoryTotals.length) {
    els.categoryList.append(emptyState("No category spending for this month yet."));
    return;
  }

  categoryTotals.forEach((item) => {
    const row = document.createElement("article");
    const share = total > 0 ? (item.total / total) * 100 : 0;
    row.className = "category-row";
    row.innerHTML = `
      <div class="category-name">${item.category}</div>
      <div class="track" aria-hidden="true"><div class="fill" style="width: ${share}%"></div></div>
      <div class="category-amount">${currency(item.total)}</div>
    `;
    els.categoryList.append(row);
  });
}

function renderTransactions(expenses) {
  els.transactionList.innerHTML = "";

  if (!expenses.length) {
    els.transactionList.append(emptyState("No transactions for this month yet."));
    return;
  }

  expenses.forEach((expense) => {
    const node = els.transactionTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('[data-field="note"]').textContent = expense.note || expense.category;
    node.querySelector('[data-field="meta"]').textContent = `${expense.category} • ${new Date(
      `${expense.date}T00:00:00`,
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    node.querySelector('[data-field="amount"]').textContent = currency(expense.amount);
    node.querySelector("[data-action='delete']").addEventListener("click", async () => {
      const label = expense.note || expense.category;
      if (!confirm(`Delete "${label}" for ${currency(expense.amount)}?`)) return;
      setBusy(true);
      try {
        await deleteExpense(expense.id);
        render();
      } catch {
        alert("That expense could not be deleted. Please try again.");
      } finally {
        setBusy(false);
      }
    });
    els.transactionList.append(node);
  });
}

function emptyState(message) {
  const element = document.createElement("div");
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function renderShell() {
  const isCloudSignedIn = state.storageMode === "cloud" && state.user;
  els.authPanel.hidden = state.storageMode === "local" || isCloudSignedIn;
  els.appContent.hidden = state.storageMode === "cloud" && !state.user;
  els.signOut.hidden = !isCloudSignedIn;
  els.codeForm.hidden = state.storageMode === "local" || isCloudSignedIn;
  els.storageStatus.textContent = isCloudSignedIn
    ? `Cloud storage active for ${state.user.email}`
    : "Local browser storage";
}

function render() {
  renderShell();
  els.selectedMonth.value = state.selectedMonth;
  els.monthlyBudget.value = state.budget;

  const expenses = monthExpenses();
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const categoryTotals = groupByCategory(expenses);
  const dayTotals = groupByDay(expenses);

  renderSummary(expenses, categoryTotals, dayTotals, total);
  renderInsights(expenses, categoryTotals, dayTotals, total);
  renderDailyChart(dayTotals);
  renderCategories(categoryTotals, total);
  renderTransactions(expenses);
}

function shiftMonth(amount) {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  state.selectedMonth = toMonthValue(date);
  els.expenseDate.value = toLocalDateValue(date);
  if (state.storageMode === "local") saveLocal();
  render();
}

async function seedDemoData() {
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const sample = [
    [2, 86.42, "Groceries", "Weekly groceries"],
    [3, 18.7, "Dining", "Lunch"],
    [5, 52.15, "Transport", "Fuel"],
    [7, 12.99, "Subscriptions", "Music"],
    [9, 140, "Home", "Utility bill"],
    [10, 33.8, "Dining", "Dinner"],
    [13, 74.3, "Shopping", "Clothes"],
    [16, 25, "Health", "Pharmacy"],
    [18, 91.2, "Groceries", "Market"],
    [20, 16, "Transport", "Parking"],
    [23, 120, "Travel", "Weekend trip"],
    [26, 9.99, "Subscriptions", "Cloud storage"],
  ];

  const existingDemoIds = new Set(state.expenses.map((expense) => expense.id));
  setBusy(true);

  try {
    for (const [index, item] of sample.entries()) {
      const [day, amount, category, note] = item;
      const localDemoId = `demo-${state.selectedMonth}-${index + 1}`;
      if (state.storageMode === "local" && existingDemoIds.has(localDemoId)) continue;

      await addExpense({
        id: localDemoId,
        date: toLocalDateValue(new Date(year, month - 1, day)),
        amount,
        category,
        note,
        createdAt: Date.now() + index,
      });
    }
    render();
  } catch {
    alert("Demo data could not be added. Please try again.");
  } finally {
    setBusy(false);
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify({ expenses: state.expenses, budget: state.budget }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `monthly-spending-${toMonthValue(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.expenses)) throw new Error("Missing expenses");

    setBusy(true);
    for (const expense of parsed.expenses) {
      if (!expense.date || !expense.amount || !expense.category) continue;
      await addExpense({
        id: expense.id || crypto.randomUUID(),
        date: expense.date,
        amount: Number(expense.amount),
        category: categories.includes(expense.category) ? expense.category : "Other",
        note: expense.note || "",
        createdAt: Number(expense.createdAt) || Date.now(),
      });
    }
    state.budget = Number(parsed.budget) || state.budget;
    await saveBudget();
    render();
  } catch {
    alert("That file could not be imported. Please choose an exported spending JSON file.");
  } finally {
    setBusy(false);
    els.importData.value = "";
  }
}

async function initializeCloud() {
  if (!hasCloudConfig) {
    loadLocal();
    render();
    return;
  }

  try {
    const { createClient } = await import(SUPABASE_CDN);
    state.cloud = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await state.cloud.auth.getSession();
    state.user = data.session?.user || null;

    state.cloud.auth.onAuthStateChange(async (_event, session) => {
      state.user = session?.user || null;
      if (state.user) {
        try {
          await loadCloud();
        } catch {
          showMessage("Signed in, but cloud data could not load yet.", "error");
        }
      }
      render();
    });

    if (state.user) await loadCloud();
    render();
  } catch {
    state.storageMode = "local";
    loadLocal();
    showMessage("Cloud setup is not reachable, so local storage is active.", "error");
    render();
  }
}

function bindEvents() {
  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = els.authEmail.value.trim().toLowerCase();

    if (config.allowedEmail && email !== config.allowedEmail.toLowerCase()) {
      showMessage("This app is limited to your configured email address.", "error");
      return;
    }

    setBusy(true);
    try {
      const { error } = await state.cloud.auth.signInWithOtp({ email });
      if (error) throw error;
      els.authCode.focus();
      showMessage("Check your email for the 6-digit login code.", "success");
    } catch (error) {
      showMessage(`Sign-in failed: ${error.message || "Check your Supabase settings."}`, "error");
    } finally {
      setBusy(false);
    }
  });

  els.codeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = els.authEmail.value.trim().toLowerCase();
    const token = els.authCode.value.trim();

    setBusy(true);
    try {
      const { error } = await state.cloud.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      showMessage("Signed in.", "success");
    } catch (error) {
      showMessage(`Code failed: ${error.message || "Try requesting a new code."}`, "error");
    } finally {
      setBusy(false);
    }
  });

  els.signOut.addEventListener("click", async () => {
    if (state.cloud) await state.cloud.auth.signOut();
  });

  els.expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = Number(els.expenseAmount.value);
    if (!amount || amount <= 0) return;

    setBusy(true);
    try {
      await addExpense({
        id: crypto.randomUUID(),
        date: els.expenseDate.value,
        amount,
        category: els.expenseCategory.value,
        note: els.expenseNote.value.trim(),
        createdAt: Date.now(),
      });

      state.selectedMonth = els.expenseDate.value.slice(0, 7);
      els.expenseAmount.value = "";
      els.expenseNote.value = "";
      render();
      els.expenseAmount.focus();
    } catch {
      alert("That expense could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  });

  els.selectedMonth.addEventListener("change", () => {
    state.selectedMonth = els.selectedMonth.value;
    els.expenseDate.value = `${state.selectedMonth}-01`;
    if (state.storageMode === "local") saveLocal();
    render();
  });

  els.previousMonth.addEventListener("click", () => shiftMonth(-1));
  els.nextMonth.addEventListener("click", () => shiftMonth(1));
  els.seedDemo.addEventListener("click", seedDemoData);
  els.exportData.addEventListener("click", exportData);
  els.importData.addEventListener("change", (event) => importData(event.target.files[0]));

  els.monthlyBudget.addEventListener("change", async () => {
    state.budget = Number(els.monthlyBudget.value) || 0;
    setBusy(true);
    try {
      await saveBudget();
      render();
    } catch {
      alert("Budget could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  });

  els.clearMonth.addEventListener("click", async () => {
    const expenses = monthExpenses();
    if (!expenses.length) return;
    if (!confirm(`Clear all spending for ${monthName(state.selectedMonth)}?`)) return;

    setBusy(true);
    try {
      await deleteExpenses(expenses.map((expense) => expense.id));
      render();
    } catch {
      alert("This month could not be cleared. Please try again.");
    } finally {
      setBusy(false);
    }
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
      els.reportViews.forEach((view) => {
        view.classList.toggle("active", view.id === `${tab.dataset.view}View`);
      });
    });
  });
}

async function init() {
  els.expenseDate.value = toLocalDateValue(new Date());
  bindEvents();
  await initializeCloud();
}

init();
