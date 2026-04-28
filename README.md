# EMBODI Health & Fitness — Live Dashboard

A live business intelligence dashboard pulling real-time data from QuickBooks Online.

---

## Deploy to Vercel (One Time)

### Step 1 — Upload to GitHub
1. Go to github.com and create a free account (if you don't have one)
2. Click **New Repository** → name it `embodi-dashboard` → Create
3. Upload all these files by dragging them into the GitHub repo

### Step 2 — Connect to Vercel
1. Go to vercel.com → Sign up with GitHub
2. Click **Add New Project**
3. Select `embodi-dashboard` repository
4. Click **Deploy** (it will fail first time — that's expected)

### Step 3 — Add Environment Variables
1. In Vercel, go to your project → **Settings** → **Environment Variables**
2. Add these four variables one by one:

| Name | Value |
|------|-------|
| `QB_CLIENT_ID` | AB88yjsaDiwz9XWaRjUPtwWjXdwG3QvQDhpUNbmrLHJZiHc5sn |
| `QB_CLIENT_SECRET` | s15rHYmDk224zuBfBVuu54f1lzUPyGk8ILmFtknE |
| `QB_REFRESH_TOKEN` | (the long token from OAuth Playground) |
| `QB_REALM_ID` | 9130350235374 |

3. Click **Redeploy** → your dashboard is live!

### Step 4 — Share with Diego
- Your dashboard URL will be: `https://embodi-dashboard.vercel.app`
- Bookmark it on any device
- Hit the **↻ Refresh** button anytime for live QuickBooks data

---

## How It Works

- `/pages/api/data.js` — serverless function that calls QuickBooks API
- `/pages/index.js` — the dashboard frontend
- QuickBooks refresh token auto-renews access tokens every hour
- Historical data (2023-2025) is always shown
- Live data pulls current year YTD on demand

---

## Rotate Credentials (Security)
After deploying, go back to developer.intuit.com → Keys and credentials → **Rotate secret**
Update the `QB_CLIENT_SECRET` in Vercel Environment Variables.
