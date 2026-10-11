# Raunak Kumar Shriwastav – Portfolio Website

A modern, fully responsive developer portfolio with a working **Contact Us** form.
Messages are sent to a **Netlify Function** (the backend) and stored in **Google Firebase Firestore**.

- Frontend: one static `index.html` (HTML, CSS, vanilla JS, no build step)
- Backend: Netlify Function in Node.js (`netlify/functions/contact.js`)
- Database: Firebase Firestore, written to with the Firebase Admin SDK
- Hosting: Netlify (free tier is enough)

## How it works

```
Visitor fills form
      │  POST /api/contact (JSON)
      ▼
Netlify Function (validates, blocks spam, rate limits)
      │  Firebase Admin SDK (secret key kept in Netlify env vars)
      ▼
Firestore  →  collection "contacts"  →  you read messages in Firebase Console
```

Why a backend instead of writing to Firestore from the browser? The Firestore rules can stay fully **locked** (no public access), your secret key never reaches the browser, and the function validates every message before saving.

## Project structure

```
raunak-portfolio/
├── public/
│   └── index.html              # the portfolio website
├── netlify/
│   └── functions/
│       └── contact.js          # backend: POST /api/contact
├── netlify.toml                # Netlify build, redirect and security headers
├── package.json                # backend dependency (firebase-admin)
├── firestore.rules             # locked-down Firestore rules
├── .env.example                # template for local testing
└── .gitignore
```

## Prerequisites

- A free [Firebase](https://console.firebase.google.com) account (Google login)
- A free [Netlify](https://app.netlify.com) account
- A free [GitHub](https://github.com) account
- Git and Node.js 18+ (Node is only needed for local testing)

---

## Step 1 – Create the Firebase database

1. Open the [Firebase Console](https://console.firebase.google.com) and click **Add project**. Name it (for example `raunak-portfolio`) and finish the wizard. Google Analytics is optional.
2. In the left menu go to **Build → Firestore Database → Create database**.
3. Choose a location close to you (for India, `asia-south1` Mumbai) and start in **production mode**.
4. Open the **Rules** tab, paste the contents of `firestore.rules`, and click **Publish**. This blocks all browser access. Your function uses the Admin SDK, which is not affected by these rules.

## Step 2 – Create the service account key (backend credentials)

1. In Firebase click the gear icon → **Project settings → Service accounts**.
2. Click **Generate new private key** and confirm. A `.json` file downloads.
3. Open that file. You need three values from it:

| JSON field | Environment variable |
|---|---|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |

Keep this file private. Never upload it to GitHub, and delete it from your computer after you have added the values to Netlify.

## Step 3 – Push the project to GitHub

```bash
cd raunak-portfolio
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/<your-username>/raunak-portfolio.git
git push -u origin main
```

Create the empty repository on GitHub first (**New repository**, no README). The `.gitignore` already excludes secrets.

## Step 4 – Deploy on Netlify

1. In Netlify click **Add new site → Import an existing project → GitHub** and pick `raunak-portfolio`.
2. Netlify reads `netlify.toml`, so the settings are filled in for you: publish directory `public`, functions directory `netlify/functions`. Leave the build command empty.
3. Before deploying, open **Site configuration → Environment variables** and add the three variables from Step 2:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (paste the whole value including `-----BEGIN PRIVATE KEY-----` and the `\n` characters exactly as they appear in the JSON file)
4. Click **Deploy**. When it finishes you get a URL like `https://your-site.netlify.app`.

> **Note:** Netlify's drag-and-drop deploy only uploads static files and does **not** run functions. Use the GitHub method above (or the Netlify CLI) so the backend works.

## Step 5 – Test the contact form

1. Open your Netlify URL, scroll to **Let's talk**, and send a test message.
2. In Firebase Console go to **Firestore Database → Data → `contacts`**. A new document appears with:

| Field | Meaning |
|---|---|
| `name`, `email`, `phone`, `query` | what the visitor typed |
| `createdAt` | server timestamp |
| `status` | `"new"` (change it to `"replied"` yourself if you like) |
| `ip`, `userAgent` | helps you spot spam |

The function also creates a `rate_limits` collection. That is normal; it stores the last send time per visitor.

---

## Run locally (optional)

```bash
npm install
npm install -g netlify-cli
cp .env.example .env        # then fill in the three values
netlify dev
```

Open `http://localhost:8888`. Opening `index.html` directly from disk shows the design, but the form needs `netlify dev` or the live site because `/api/contact` is served by the function.

## Backend details

`netlify/functions/contact.js` does the following on every `POST /api/contact`:

1. Rejects anything that is not a POST request.
2. Ignores bot submissions that fill the hidden `website` field (honeypot).
3. Trims and limits each field (name 80, email 120, phone 20, query 1500 characters).
4. Checks that name, query and a valid email are present.
5. Allows one message per visitor IP every 30 seconds (returns HTTP 429 otherwise).
6. Saves the message to Firestore and returns `{ "ok": true }`.

## Customizing the site

All content lives in `public/index.html`:

- **Text and resume content:** edit the sections `about`, `skills`, `experience`, `project`, `awards`.
- **Colors:** change the variables at the top of the `<style>` block (`--a`, `--b`, `--c`, `--bg`).
- **Contact details:** search for `mahaakalbhakt7488@gmail.com` and `+91 9113440401`.
- **Page title and description:** the `<title>` and `<meta name="description">` tags in `<head>`.

Every push to `main` redeploys the site automatically.

## Optional upgrades

- **Custom domain:** Netlify → **Domain management → Add a domain**. HTTPS is automatic.
- **Email alerts for new messages:** in Firebase install the **Trigger Email from Firestore** extension, or call an email API such as Resend or SendGrid from `contact.js` after the `add()` call.
- **Stronger spam protection:** add Google reCAPTCHA v3 or Cloudflare Turnstile and verify the token inside the function.
- **Resume download:** put `Raunak_resume.pdf` in `public/` and link to `/Raunak_resume.pdf`.

## Troubleshooting

| Problem | Fix |
|---|---|
| Form says "Server error" | Check **Netlify → Logs → Functions → contact**. The usual cause is a missing or wrongly pasted environment variable. |
| `error:1E08010C:DECODER routines` or "Invalid PEM" | `FIREBASE_PRIVATE_KEY` was pasted incorrectly. Paste the value from the JSON exactly, with the `\n` sequences. |
| `/api/contact` returns 404 | The site was deployed by drag-and-drop. Redeploy from GitHub. |
| Form says "Could not reach the server" | You opened `index.html` from your disk. Use the Netlify URL or `netlify dev`. |
| `Missing Firebase environment variables` | Add all three variables, then trigger **Deploys → Trigger deploy → Clear cache and deploy site**. |
| Message not appearing in Firestore | Confirm `FIREBASE_PROJECT_ID` matches the project where you created the database. |

## Security checklist

- [x] Service account key is stored only in Netlify environment variables
- [x] `.gitignore` blocks `.env` and key files
- [x] Firestore rules deny all browser access
- [x] Server-side validation, honeypot and rate limiting
- [ ] If a key ever leaks, delete it in **Firebase → Project settings → Service accounts** (or Google Cloud IAM) and generate a new one

## License

Personal portfolio. Feel free to reuse the structure for your own site.
