# Expense Tracker

A web app to track personal expenses. You can add, edit, delete and filter expenses by category, and see the total, the count and the highest expense. Data is stored in PostgreSQL through a Node.js + Express API.

## How to run

You need Node.js (LTS), PostgreSQL with pgAdmin, and VS Code with the Live Server extension.

**Backend**

1. In pgAdmin, create an empty database named `expense_tracker`.
2. Open the Query Tool on that database, load `backend/schema.sql`, and run it. It creates the `expenses` table and adds sample data.
3. In the `backend` folder, copy `.env.example` to a new file named `.env` and write your PostgreSQL password in `DB_PASSWORD`.
4. Open a terminal in the `backend` folder and run `npm install`.
5. Run `node server.js`. You should see `API running at http://localhost:3000`. Keep it running.

**Frontend**

1. Open the `frontend` folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.

## API

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| GET | /api/expenses | 200 | - |
| GET | /api/expenses/:id | 200 | 404 |
| POST | /api/expenses | 201 | 400 |
| PUT | /api/expenses/:id | 200 | 400, 404 |
| DELETE | /api/expenses/:id | 200 | 404 |

## Features

- [x] Add an expense (with validation)
- [x] Delete an expense
- [x] Edit an expense
- [x] Filter by category
- [x] Summary cards (total, count, highest)
- [x] Data is saved in a PostgreSQL database
- [x] Responsive layout (CSS Grid for the summary cards)

## Screenshots

<!-- TODO: add 2-3 screenshots of your app (desktop and mobile). -->

## What was the hardest part?

<!-- TODO: write this in your own words: what got you stuck, and how did you solve it? -->
