# Smart Study Material Exchange Platform

A marketplace and study-notes exchange built for East West University (EWU) students —
buy/sell/exchange used textbooks, upload and AI-summarize notes, turn YouTube lectures into
study notes, generate AI practice quizzes, chat in real time, and get notified over Telegram.

Built for CSE412 (Software Engineering), Group E, based on the accompanying SRS/SDD.

## Monorepo layout

```
smart-study-exchange/
├── backend/          Express + PostgreSQL + Socket.IO API
├── frontend/          React + Vite + Tailwind SPA
├── telegram-bot/      Standalone Telegram bot (polling) sharing the same DB
└── render.yaml         One-shot Render deploy config (API + Postgres + bot worker)
```

## Architecture at a glance

- **Backend** — Express REST API, PostgreSQL (via `pg`), Socket.IO for real-time chat/notifications,
  Cloudinary for file storage (book photos, note PDFs/images, chat attachments, avatars, ad images).
- **AI** — all LLM calls go through `backend/src/services/aiProvider.js`, a single abstraction wrapping
  the Anthropic Claude API (note summarization, quiz generation, answer grading, book price prediction).
  Embeddings for semantic search use Voyage AI, with automatic fallback to keyword (Postgres full-text)
  search if no embeddings key is configured.
- **Telegram bot** — a separate Node process (`telegram-bot/`) using long polling, sharing the same
  Postgres database as the API. Supports `/link`, `/search`, `/smartsearch`, `/summarize`, `/mynotifications`.
- **Frontend** — React SPA (Vite), Tailwind with a custom dark navy/teal design system, Socket.IO client
  for live messages/notifications.

## Prerequisites

- Node.js 18+
- A PostgreSQL database (Render's free Postgres works fine)
- Accounts/API keys for: Cloudinary, Google Gemini (free, no billing needed), a Telegram bot (via @BotFather)
- Optional: YouTube Data API key (nicer video titles), SMTP credentials (email delivery of OTP
  codes — without this, OTPs are logged to the server console)

## 1. Local setup

### Backend

```bash
cd backend
cp .env.example .env    # fill in your values
npm install
npm run migrate         # creates all tables (auto-detects if pgvector isn't available)
npm run seed             # creates an admin user (see console output for credentials)
npm run dev               # starts on http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:4000
npm install
npm run dev               # starts on http://localhost:5173
```

### Telegram bot

```bash
cd telegram-bot
cp ../backend/.env.example .env   # only needs TELEGRAM_BOT_TOKEN, API_BASE_URL, DATABASE_URL
npm install
npm start
```

## 2. Getting your API keys

- **Cloudinary**: sign up at cloudinary.com → Dashboard → copy Cloud name, API Key, API Secret.
- **Google Gemini (AI features)**: **completely free, no credit card required.** Go to
  [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), sign in with any
  Google account, click "Create API Key". This single key powers summarization, quiz
  generation, price prediction, *and* semantic search embeddings.
- **Telegram bot**: message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → copy the token.
- **YouTube Data API** (optional, nicer titles): console.cloud.google.com → enable "YouTube Data API v3" → create an API key.
- **SMTP** (optional, for real OTP emails): a Gmail App Password works well for `SMTP_HOST=smtp.gmail.com`.

## 3. Deploying

### Backend + Telegram bot → Render

This repo includes a `render.yaml` "Blueprint" that provisions:
- A free Postgres database
- A web service running the API
- A background worker running the Telegram bot

Steps:
1. Push this repo to GitHub.
2. In Render, click **New → Blueprint**, point it at your repo, and it will read `render.yaml`.
3. Render will prompt you for the `sync: false` environment variables (Cloudinary, Anthropic,
   SMTP, Telegram token, etc.) — fill these in during setup or afterward in each service's
   **Environment** tab.
4. Set `CORS_ORIGINS` on the API service to your Vercel frontend URL once you have it
   (comma-separated if you need more than one, e.g. a preview + production URL).
5. After the first deploy, open the API service's **Shell** tab and run:
   ```bash
   npm run migrate
   npm run seed
   ```
   (Or run these locally with `DATABASE_URL` pointed at the Render database.)

### Frontend → Vercel

1. Import the repo in Vercel, set the project **Root Directory** to `frontend`.
2. Vercel auto-detects the Vite framework preset (a `vercel.json` is included as a fallback).
3. Add environment variable `VITE_API_URL` = your Render API URL (e.g. `https://smart-study-exchange-api.onrender.com`).
4. Deploy. Update `CORS_ORIGINS` on the Render API service to match the resulting Vercel URL.

## 4. Default admin login

After running `npm run seed` in `backend/`, log in with the email/password printed in the
console (defaults to `admin@ewu.edu.bd` / `ChangeMe123!` unless you set `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`). **Change this password after first login.**

## 5. Notes on design choices

- **Graceful AI degradation**: every AI-dependent route returns a clear `503`-style error if its
  provider key isn't configured, rather than crashing — so you can deploy incrementally and add
  keys later.
- **Free AI provider**: uses the Google Gemini API, which has a genuinely free tier (no prepaid
  credit required, unlike Anthropic/OpenAI). One `GEMINI_API_KEY` powers summarization, quiz
  generation, price prediction, and semantic search embeddings.
- **Semantic search fallback**: if `GEMINI_API_KEY` isn't set (or an embedding request fails),
  smart search silently falls back to Postgres full-text keyword search so the feature never hard-fails.
- **pgvector optional**: the migration script detects whether your Postgres instance supports the
  `vector` extension and adapts the schema automatically.
- **File storage**: all uploads (book photos, note files, chat attachments, avatars, ad images) go
  to Cloudinary, so nothing is lost on Render's ephemeral filesystem across redeploys.

## Functional requirements coverage

| FR | Feature | Where |
|----|---------|-------|
| FR1–3 | Registration, login, email OTP verification | `backend/src/routes/auth.js` |
| FR4 | Upload book listings | `backend/src/routes/books.js` |
| FR5 | Upload notes | `backend/src/routes/notes.js` |
| FR6 | Search books by course/semester/department/title | `backend/src/routes/books.js` |
| FR7–8 | Exchange requests + negotiation | `backend/src/routes/exchanges.js` |
| FR9–10 | Real-time messaging + attachments | `backend/src/routes/messages.js`, `sockets/` |
| FR11 | Ratings | `backend/src/routes/ratings.js` |
| FR12 | Notifications (push/email/Telegram) | `backend/src/services/notification*.js` |
| FR13–14 | Ads + admin moderation | `backend/src/routes/ads.js`, `admin.js` |
| FR15 | AI note summarizer + YouTube-to-notes | `backend/src/routes/notes.js`, `services/aiProvider.js` |
| FR16 | AI quiz generator | `backend/src/routes/quizzes.js` |
| FR17 | Smart (semantic) search | `backend/src/services/searchStrategies.js` |
| FR18 | Telegram bot | `telegram-bot/` |
