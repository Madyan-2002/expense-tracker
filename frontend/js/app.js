// Expense Tracker - frontend logic
// Every action talks to the backend with fetch + async/await.

const API_URL = "http://localhost:3000/api/expenses";
const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Other"];

// Bootstrap colour for each category badge
const BADGE_COLORS = {
  Food: "success",
  Transport: "primary",
  Bills: "danger",
  Entertainment: "warning",
  Other: "secondary",
};

let allExpenses = []; // the full list exactly as the server returned it

// ---------- element references ----------
const alertBox = document.getElementById("alertBox");
const spinner = document.getElementById("spinner");
const expenseBody = document.getElementById("expenseBody");
const emptyMessage = document.getElementById("emptyMessage");
const filterCategory = document.getElementById("filterCategory");

const addForm = document.getElementById("addForm");
const addBtn = document.getElementById("addBtn");
const editForm = document.getElementById("editForm");
const editBtn = document.getElementById("editBtn");
const editModal = new bootstrap.Modal(document.getElementById("editModal"));

// ---------- small helpers ----------
function formatMoney(value) {
  return "$" + Number(value).toFixed(2);
}

function showAlert(message, type = "danger") {
  alertBox.innerHTML = ""; // keep only one alert at a time
  const div = document.createElement("div");
  div.className = `alert alert-${type} alert-dismissible fade show`;
  div.setAttribute("role", "alert");
  div.textContent = message; // textContent: safe even if the message has HTML
  const close = document.createElement("button");
  close.type = "button";
  close.className = "btn-close";
  close.setAttribute("data-bs-dismiss", "alert");
  close.setAttribute("aria-label", "Close");
  div.appendChild(close);
  alertBox.appendChild(div);
}

function setLoading(isLoading) {
  spinner.classList.toggle("d-none", !isLoading);
}

function fillCategorySelect(select, withAll) {
  select.innerHTML = "";
  if (withAll) {
    select.appendChild(new Option("All", "All"));
  }
  for (const category of CATEGORIES) {
    select.appendChild(new Option(category, category));
  }
}

// ---------- API functions ----------

// One place that sends the request and turns every failure into a clear Error.
async function request(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    // fetch only throws when the server cannot be reached at all
    throw new Error("Cannot reach the server. Make sure the backend is running on port 3000.");
  }

  // Second await: reading the body is also asynchronous (the first await only waited for the headers).
  // The body may not be JSON, so we protect against that.
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  // fetch does NOT throw on 400/404/500, so we check response.ok ourselves
  if (!response.ok) {
    throw new Error((data && data.message) || `Request failed (status ${response.status}).`);
  }
  return data;
}

function getExpenses() {
  return request(API_URL);
}

function addExpense(expense) {
  return request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
}

function updateExpense(id, expense) {
  return request(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense),
  });
}

function deleteExpense(id) {
  return request(`${API_URL}/${id}`, { method: "DELETE" });
}

// ---------- rendering ----------

function renderSummary(list) {
  // The cards always use ALL expenses, never the filtered list
  const total = list.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById("totalAmount").textContent = formatMoney(total);
  document.getElementById("expenseCount").textContent = list.length;

  if (list.length === 0) {
    document.getElementById("highestAmount").textContent = formatMoney(0);
    document.getElementById("highestTitle").textContent = "No expenses yet";
    return;
  }
  const highest = list.reduce((max, e) => (e.amount > max.amount ? e : max));
  document.getElementById("highestAmount").textContent = formatMoney(highest.amount);
  document.getElementById("highestTitle").textContent = highest.title;
}

function createCell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function renderTable(list) {
  expenseBody.innerHTML = "";
  emptyMessage.classList.toggle("d-none", list.length > 0);

  for (const expense of list) {
    const tr = document.createElement("tr");

    tr.appendChild(createCell(expense.title, "title-cell"));
    tr.appendChild(createCell(formatMoney(expense.amount)));

    const badgeCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge text-bg-${BADGE_COLORS[expense.category] || "secondary"}`;
    badge.textContent = expense.category;
    badgeCell.appendChild(badge);
    tr.appendChild(badgeCell);

    tr.appendChild(createCell(expense.date));

    const actions = document.createElement("td");
    actions.className = "text-end text-nowrap";

    const editButton = document.createElement("button");
    editButton.className = "btn btn-sm btn-outline-primary me-2";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => openEditModal(expense));

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-sm btn-outline-danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => handleDelete(expense, deleteButton));

    actions.append(editButton, deleteButton);
    tr.appendChild(actions);
    expenseBody.appendChild(tr);
  }
}

function applyFilter() {
  const selected = filterCategory.value;
  const visible = selected === "All"
    ? allExpenses
    : allExpenses.filter((e) => e.category === selected);
  renderTable(visible);
}

// Get the list from the server, then redraw everything.
async function refresh() {
  setLoading(true);
  try {
    allExpenses = await getExpenses();
    renderSummary(allExpenses);
    applyFilter();
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
}

// ---------- form validation ----------

function setFieldError(input, message) {
  input.classList.toggle("is-invalid", Boolean(message));
  input.nextElementSibling.textContent = message || "";
}

// Reads the 4 inputs of a form, shows errors, and returns the data (or null if invalid)
function readAndValidate(prefix) {
  const titleInput = document.getElementById(prefix + "Title");
  const amountInput = document.getElementById(prefix + "Amount");
  const categoryInput = document.getElementById(prefix + "Category");
  const dateInput = document.getElementById(prefix + "Date");

  const title = titleInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  const titleError = title === "" ? "Title is required."
    : title.length > 100 ? "Title must be 100 characters or less." : "";
  const amountError = Number.isNaN(amount) || amount <= 0 ? "Amount must be a number greater than 0." : "";
  const categoryError = CATEGORIES.includes(category) ? "" : "Please choose a category.";
  const dateError = date === "" ? "Date is required." : "";

  setFieldError(titleInput, titleError);
  setFieldError(amountInput, amountError);
  setFieldError(categoryInput, categoryError);
  setFieldError(dateInput, dateError);

  if (titleError || amountError || categoryError || dateError) return null;
  return { title, amount, category, date };
}

function clearErrors(form) {
  form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

// ---------- event handlers ----------

async function handleAdd(event) {
  event.preventDefault();
  const data = readAndValidate("add");
  if (!data) return;

  addBtn.disabled = true;
  try {
    await addExpense(data);
    addForm.reset();
    document.getElementById("addDate").value = todayString();
    clearErrors(addForm);
    showAlert("Expense added.", "success");
    await refresh(); // show what the server really saved
  } catch (err) {
    showAlert(err.message);
  } finally {
    addBtn.disabled = false;
  }
}

function openEditModal(expense) {
  clearErrors(editForm);
  document.getElementById("editId").value = expense.id;
  document.getElementById("editTitle").value = expense.title;
  document.getElementById("editAmount").value = expense.amount;
  document.getElementById("editCategory").value = expense.category;
  document.getElementById("editDate").value = expense.date;
  editModal.show();
}

async function handleEdit(event) {
  event.preventDefault();
  const data = readAndValidate("edit");
  if (!data) return;

  const id = document.getElementById("editId").value;
  editBtn.disabled = true;
  try {
    await updateExpense(id, data);
    editModal.hide();
    showAlert("Expense updated.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message); // e.g. the 400 message from the server
  } finally {
    editBtn.disabled = false;
  }
}

async function handleDelete(expense, button) {
  if (!confirm(`Delete "${expense.title}"?`)) return;

  button.disabled = true;
  try {
    await deleteExpense(expense.id);
    showAlert("Expense deleted.", "success");
    await refresh();
  } catch (err) {
    showAlert(err.message);
    button.disabled = false;
  }
}

// Today as YYYY-MM-DD in the user's local time zone
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// ---------- start ----------
fillCategorySelect(document.getElementById("addCategory"), false);
fillCategorySelect(document.getElementById("editCategory"), false);
fillCategorySelect(filterCategory, true);
document.getElementById("addDate").value = todayString();

addForm.addEventListener("submit", handleAdd);
editForm.addEventListener("submit", handleEdit);
filterCategory.addEventListener("change", applyFilter);

refresh();
