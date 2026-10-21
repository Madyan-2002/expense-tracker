// Expense Tracker - backend (Express API + PostgreSQL)
// Run:  node server.js   (restart it every time you change this file)

require("dotenv").config();
const express = require("express");  
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Other"];

// One Pool for the whole app, configured from the .env file
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(cors());          // allow the frontend (another port) to call this API
app.use(express.json());  // read JSON bodies into req.body

// pg returns NUMERIC as text and DATE as a JS Date, so we convert both in SQL
const FIELDS = "id, title, amount::float8 AS amount, category, to_char(date, 'YYYY-MM-DD') AS date";

// ---------- helpers ----------

// A valid id is a positive whole number that fits in a PostgreSQL integer
function isValidId(value) {
  return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 2147483647;
}

// Returns an error message if the data is wrong, or null if it is fine
function validateExpense(body) {
  const { title, amount, category, date } = body || {};

  if (typeof title !== "string" || title.trim() === "") {
    return "Title is required.";
  }
  if (title.trim().length > 100) {
    return "Title must be 100 characters or less.";
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return "Amount must be a number greater than 0.";
  }
  if (amount >= 1000000000) {
    return "Amount is too large.";
  }
  if (!CATEGORIES.includes(category)) {
    return "Category must be one of: " + CATEGORIES.join(", ") + ".";
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "Date is required in the format YYYY-MM-DD.";
  }
  // Reject dates that look right but do not exist (like 2026-02-31)
  const parsed = new Date(date + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return "Date is not a real calendar date.";
  }
  return null;
}

function serverError(res, err) {
  console.error(err.message);
  res.status(500).json({ message: "Something went wrong on the server." });
}

// ---------- routes ----------

// GET all expenses
app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${FIELDS} FROM expenses ORDER BY date DESC, id DESC`);
    res.status(200).json(result.rows);
  } catch (err) {
    serverError(res, err);
  }
});

// GET one expense
app.get("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: "Expense not found." });
  }
  try {
    const result = await pool.query(`SELECT ${FIELDS} FROM expenses WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// POST add an expense
app.post("/api/expenses", async (req, res) => {
  const problem = validateExpense(req.body);
  if (problem) {
    return res.status(400).json({ message: problem });
  }
  const { title, amount, category, date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO expenses (title, amount, category, date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${FIELDS}`,
      [title.trim(), amount, category, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT update an expense
app.put("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: "Expense not found." });
  }
  const problem = validateExpense(req.body);
  if (problem) {
    return res.status(400).json({ message: problem });
  }
  const { title, amount, category, date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE expenses
       SET title = $1, amount = $2, category = $3, date = $4
       WHERE id = $5
       RETURNING ${FIELDS}`,
      [title.trim(), amount, category, date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE an expense
app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ message: "Expense not found." });
  }
  try {
    const result = await pool.query(
      `DELETE FROM expenses WHERE id = $1 RETURNING ${FIELDS}`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json({ message: "Expense deleted.", expense: result.rows[0] });
  } catch (err) {
    serverError(res, err);
  }
});

// Unknown routes and bad JSON bodies return JSON, never an HTML page
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON." });
  }
  serverError(res, err);
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
