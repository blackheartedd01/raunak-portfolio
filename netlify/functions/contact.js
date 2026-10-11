const admin = require("firebase-admin");

let db;
function getDb() {
  if (!db) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error("Missing Firebase environment variables");
    }
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    db = admin.firestore();
  }
  return db;
}

const reply = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const clean = (v, max) => String(v || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method not allowed." });

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return reply(400, { error: "Invalid request." }); }

  if (data.website) return reply(200, { ok: true }); // honeypot: bots fill this hidden field

  const name = clean(data.name, 80);
  const email = clean(data.email, 120);
  const phone = clean(data.phone, 20);
  const query = String(data.query || "").trim().slice(0, 1500);

  if (!name || !query) return reply(400, { error: "Name and query are required." });
  if (!/^\S+@\S+\.\S+$/.test(email)) return reply(400, { error: "Enter a valid email address." });

  try {
    const firestore = getDb();
    const ip = event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "unknown";

    // Simple rate limit: one message per IP every 30 seconds
    const key = Buffer.from(ip).toString("base64url").slice(0, 60);
    const limitRef = firestore.collection("rate_limits").doc(key);
    const last = await limitRef.get();
    if (last.exists && Date.now() - last.data().at < 30000) {
      return reply(429, { error: "Please wait a few seconds before sending another message." });
    }
    await limitRef.set({ at: Date.now() });

    await firestore.collection("contacts").add({
      name, email, phone, query,
      ip,
      userAgent: clean(event.headers["user-agent"], 200),
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return reply(200, { ok: true });
  } catch (err) {
    console.error("contact function error:", err.message);
    return reply(500, { error: "Server error. Please try again later." });
  }
};
