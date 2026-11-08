import nextEnv from "@next/env";
import https from "node:https";
import { query } from "../lib/db.js";

nextEnv.loadEnvConfig(process.cwd());

if (process.env.ASSIGN_DEMO_MEMBER_PASSWORDS !== "true" || process.env.CONFIRM_DEMO_PASSWORD_RESET !== "true" || process.env.ALLOW_DEMO_PASSWORD_PROVISIONING !== "true") {
  throw new Error("Provisioning requires ASSIGN_DEMO_MEMBER_PASSWORDS=true, CONFIRM_DEMO_PASSWORD_RESET=true, and ALLOW_DEMO_PASSWORD_PROVISIONING=true.");
}
if (process.env.NEON_BRANCH !== "production") throw new Error("This provisioning command is limited to the explicitly linked production branch.");
const baseUrl = process.env.NEON_AUTH_BASE_URL || process.env.BETTER_AUTH_URL;
const endpointIp = process.env.NEON_AUTH_ENDPOINT_IP;
const adminEmail = process.env.DEMO_ADMIN_EMAIL;
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
if (!baseUrl || !endpointIp || !adminEmail || !adminPassword) throw new Error("Set Neon Auth endpoint values and DEMO_ADMIN_EMAIL/DEMO_ADMIN_PASSWORD in the local environment.");
const authUrl = new URL(baseUrl);

function callAuth(path, payload, cookie = "") {
  const url = new URL(`${authUrl.pathname.replace(/\/$/, "")}/${path.replace(/^\//, "")}`, authUrl.origin);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      servername: authUrl.hostname,
      lookup: (_host, options, callback) => options?.all
        ? callback(null, [{ address: endpointIp, family: 4 }])
        : callback(null, endpointIp, 4),
      headers: {
        "content-type": "application/json",
        origin: process.env.APP_URL || "http://localhost:3000",
        ...(cookie ? { cookie } : {}),
      },
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString(),
      }));
      response.on("error", reject);
    });
    req.on("error", reject);
    req.end(JSON.stringify(payload));
  });
}

const members = await query("SELECT id,email FROM profiles WHERE role='student' AND is_demo=true ORDER BY email");
if (members.rows.length !== 15) throw new Error(`Expected 15 demo students; found ${members.rows.length}. No password changes were made.`);
const targets = members.rows.map((member) => {
  const localPart = member.email.split("@")[0];
  const key = localPart.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const variable = `DEMO_PASSWORD_${key}`;
  const password = process.env[variable];
  if (!password || password.length < 12) throw new Error(`Set a unique password of at least 12 characters in ${variable}. No password changes were made.`);
  return { id: member.id, password, variable };
});
if (new Set(targets.map((target) => target.password)).size !== targets.length) throw new Error("Each demo student must have a different password. No password changes were made.");

const adminLogin = await callAuth("sign-in/email", { email: adminEmail, password: adminPassword, rememberMe: false });
if (adminLogin.status < 200 || adminLogin.status >= 300) throw new Error(`Neon Auth administrator sign-in failed with HTTP ${adminLogin.status}. No password changes were made.`);
const sessionCookies = (adminLogin.headers["set-cookie"] || []).map((value) => value.split(";", 1)[0]).join("; ");
if (!sessionCookies) throw new Error("Neon Auth did not return an administrator session cookie. No password changes were made.");

let completed = 0;
for (const target of targets) {
  const result = await callAuth("admin/set-user-password", { userId: target.id, newPassword: target.password }, sessionCookies);
  if (result.status < 200 || result.status >= 300) throw new Error(`Password provisioning stopped after ${completed} accounts (HTTP ${result.status}). Passwords were not logged; rerun only after review with the same explicit confirmation flags.`);
  completed += 1;
}
console.log(JSON.stringify({ branch: process.env.NEON_BRANCH, demoAccountsUpdated: completed, distinctPasswords: true, plaintextPasswordsPersisted: false, passwordsLogged: false }));
