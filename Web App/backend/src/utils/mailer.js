// src/utils/mailer.js
// FICA Congress 2026 — SMTP mailer + reset-token helpers + branded templates

import nodemailer from "nodemailer";
import crypto from "crypto";

/**
 * Send an email using SMTP settings pulled from event_settings.
 * Throws if SMTP isn't configured yet.
 */
export async function sendEmail(pool, { to, subject, html }) {
  const [rows] = await pool.query(
    `SELECT setting_key, setting_value FROM event_settings
     WHERE setting_key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from_email','smtp_from_name','smtp_encryption')`
  );
  const s = {};
  rows.forEach(r => { s[r.setting_key] = r.setting_value; });

  if (!s.smtp_host || !s.smtp_user) {
    throw new Error("SMTP is not configured. Go to Settings → Email / SMTP to set it up.");
  }

  const port = parseInt(s.smtp_port) || 587;
  const secure = s.smtp_encryption === "ssl" || port === 465;

  const transporter = nodemailer.createTransport({
    host: s.smtp_host,
    port,
    secure,
    auth: { user: s.smtp_user, pass: s.smtp_pass },
    tls: s.smtp_encryption === "none" ? { rejectUnauthorized: false } : undefined,
  });

  const fromName = s.smtp_from_name || "FICA Congress 2026";
  const fromEmail = s.smtp_from_email || s.smtp_user;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
}

/* ═══════════════════════ RESET TOKEN HELPERS ═══════════════════════ */

export function generateResetToken() {
  return crypto.randomUUID() + "-" + crypto.randomBytes(16).toString("hex");
}

/**
 * Store a reset token for a user. Supports both admin and delegate users.
 * Key format: reset_token_{scope}_{userId}  (scope = 'admin' | 'delegate')
 * Value format: {token}|{expiryMs}
 * Expires after 1 hour.
 */
export async function storeResetToken(pool, { scope, userId, token }) {
  const expiry = Date.now() + 3600000;
  const key = `reset_token_${scope}_${userId}`;
  const value = `${token}|${expiry}`;
  await pool.query(
    "INSERT INTO event_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
    [key, value, value]
  );
}

/**
 * Validate a reset token. Returns { scope, userId } if valid.
 * Consumes (deletes) the token on success or expiry.
 */
export async function validateResetToken(pool, token) {
  const [rows] = await pool.query(
    "SELECT setting_key, setting_value FROM event_settings WHERE setting_key LIKE 'reset_token_%'"
  );
  for (const row of rows) {
    const [storedToken, expiryStr] = (row.setting_value || "").split("|");
    if (storedToken === token) {
      await pool.query("DELETE FROM event_settings WHERE setting_key = ?", [row.setting_key]);
      if (Date.now() > parseInt(expiryStr)) {
        throw new Error("Reset link has expired. Please request a new one.");
      }
      // key is reset_token_{scope}_{userId}
      const parts = row.setting_key.split("_");
      const userId = parseInt(parts[parts.length - 1]);
      const scope = parts[2]; // admin | delegate
      return { scope, userId };
    }
  }
  throw new Error("Invalid or expired reset link.");
}

/* ═══════════════════════ EMAIL TEMPLATES ═══════════════════════ */

const NAVY = "#0F2D5E";
const GOLD = "#C8A951";

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 16px;">
  <div style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 14px rgba(15,45,94,0.05);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, ${NAVY} 0%, #1a4080 100%);padding:32px 32px 28px;text-align:center;">
      <div style="color:${GOLD};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;margin-bottom:6px;">
        FICA Annual Congress
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.01em;">
        2026
      </h1>
      <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.55);">
        Sofitel Fiji Resort &amp; Spa &bull; 14–15 April 2026
      </p>
    </div>
    <!-- Body -->
    <div style="padding:28px 28px 32px;">
      ${content}
    </div>
  </div>
  <p style="text-align:center;margin:20px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
    Fiji Institute of Chartered Accountants<br>
    <span style="color:#cbd5e1;">This is an automated message from the FICA Congress platform.</span>
  </p>
</div>
</body></html>`;
}

export function onboardingEmail({ firstName, email, resetLink, accountType = "delegate" }) {
  const heading = accountType === "admin"
    ? "Welcome to the admin panel"
    : "Welcome to FICA Congress 2026";
  const intro = accountType === "admin"
    ? "Your administrator account has been created. Click below to set your password and sign into the admin dashboard."
    : "Your delegate account has been created. Click below to set your password and start exploring the event in the FICA Congress mobile app.";

  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${heading}</h2>
    <p style="margin:0 0 22px;font-size:14px;color:#64748b;line-height:1.6;">
      Hi ${firstName || "there"}, ${intro}
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin:0 0 26px;">
      <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">
        Your login email
      </p>
      <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#0f172a;font-family:ui-monospace,monospace;">
        ${email}
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${resetLink}" style="display:inline-block;background:${NAVY};color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 36px;border-radius:999px;">
        Set Up Password
      </a>
      <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">
        This link expires in 1 hour
      </p>
    </div>
  `);
}

export function resetPasswordEmail({ firstName, resetLink }) {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">Reset your password</h2>
    <p style="margin:0 0 26px;font-size:14px;color:#64748b;line-height:1.6;">
      Hi ${firstName || "there"}, a password reset was requested for your FICA Congress account. Click the button below to choose a new password.
    </p>

    <div style="text-align:center;">
      <a href="${resetLink}" style="display:inline-block;background:${NAVY};color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 36px;border-radius:999px;">
        Reset Password
      </a>
      <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">
        This link expires in 1 hour
      </p>
    </div>

    <div style="border-top:1px solid #f1f5f9;margin-top:28px;padding-top:18px;">
      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Didn't request this reset? You can safely ignore this email — your password won't be changed.
      </p>
    </div>
  `);
}

export function testEmail() {
  return emailWrapper(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">SMTP is working ✓</h2>
    <p style="margin:0 0 22px;font-size:14px;color:#64748b;line-height:1.6;">
      This is a test email from the FICA Congress admin panel. If you received this message, your SMTP configuration is correct and onboarding / password-reset emails will be sent successfully.
    </p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#065f46;font-weight:600;">
        ✓ Delivery confirmed
      </p>
      <p style="margin:4px 0 0;font-size:12px;color:#047857;">
        You're ready to send onboarding and reset emails to delegates and admins.
      </p>
    </div>
  `);
}
