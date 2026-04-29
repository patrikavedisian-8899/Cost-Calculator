# Monthly Spending

A private spending tracker for testing monthly reports. It works locally with browser storage, and it is ready to deploy to Vercel with Supabase login and database storage.

## Local Test

Open `index.html` in a browser.

If `app-config.js` is empty, the app uses local browser storage. That is useful for testing the interface, but it does not sync between phone and laptop.

## Private Cloud Setup

Use this when you want the same data on phone and laptop.

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase-schema.sql`.
3. In Supabase Auth, enable email sign-in.
4. Add your deployed Vercel URL to Supabase Auth Site URL and redirect URLs after deployment.
5. In Supabase Auth Email Templates, use a 6-digit code email. The email body should include `{{ .Token }}`.
6. Fill in `app-config.js`:

```js
window.SPENDING_APP_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  allowedEmail: "you@example.com",
};
```

The anon key is safe to use in a browser app when Row Level Security is enabled. The SQL file enables Row Level Security so users can only read and write their own expenses.
Never put a Supabase `service_role` key in this app.

For the most private one-person setup, create/sign in with your own user, then disable new public signups in Supabase Auth settings. If signups stay open, other people with the URL should not see your data, but they may be able to create their own empty account.

## Deploy To Vercel

1. Create a Vercel project.
2. Import this folder or connect a GitHub repo containing these files.
3. Use the default static site settings. There is no build command needed.
4. After the first deploy, copy the Vercel URL into Supabase Auth Site URL and redirect URLs.
5. Open the Vercel URL on your phone and laptop, then sign in with the same email and 6-digit code.

## What it does

- Add expenses with date, amount, category, and note.
- Filter reports by month.
- See total spending, budget status, daily average, projected spending, and top category.
- Review insights, daily rhythm, category breakdown, and transactions.
- Save data locally or in Supabase cloud storage.
- Export and import JSON data for backup or moving browsers.

## Notes

Deleting a transaction or clearing a month asks for confirmation first. Exporting backups is still a good habit while testing.
