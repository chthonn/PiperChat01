import { google } from "googleapis";
import {
  createGmailOAuth2Client,
  getMailUser,
  hasGmailOAuthCredentials,
} from "../lib/gmailOAuth.js";
import logger from "../lib/winston.js";

function buildRawMessage({ from, to, subject, text, html }) {
  const boundary = `piperchat_${Date.now()}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    "",
    `--${boundary}--`,
  ];

  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildOtpContent(name, otp) {
  const displayName = name || "there";
  const text = `Hello ${displayName},

You registered an account on PiperChat. Your verification code is: ${otp}

If you did not sign up, you can ignore this email.

Kind regards,
PiperChat`;

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Hello ${displayName},</p>
  <p>You registered on <strong>PiperChat</strong>. Your verification code:</p>
  <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px; margin: 24px 0;">${otp}</p>
  <p style="color: #555; font-size: 14px;">If you did not sign up, ignore this email.</p>
  <p>Kind regards,<br>PiperChat</p>
</body>
</html>`;

  return { text, html, subject: "Your PiperChat verification code" };
}

export async function verifyGmailApi() {
  if (!hasGmailOAuthCredentials()) {
    return { ok: false, reason: "mail_not_configured" };
  }

  const auth = createGmailOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    const address = profile.data.emailAddress || getMailUser();
    return { ok: true, address };
  } catch (error) {
    const msg = error.message || String(error);
    if (msg.includes("invalid_grant")) {
      return {
        ok: false,
        reason: "invalid_grant",
        hint:
          "Regenerate OAUTH_REFRESH_TOKEN: cd server && npm run gmail:oauth-setup",
      };
    }
    return { ok: false, reason: "verify_failed", error: msg };
  }
}

export async function sendOtpViaGmailApi(otp, to, name) {
  if (!hasGmailOAuthCredentials()) {
    return { ok: false, reason: "mail_not_configured" };
  }

  const fromAddress = getMailUser();
  const { text, html, subject } = buildOtpContent(name, otp);
  const raw = buildRawMessage({
    from: `"PiperChat" <${fromAddress}>`,
    to,
    subject,
    text,
    html,
  });

  const auth = createGmailOAuth2Client();
  const gmail = google.gmail({ version: "v1", auth });

  try {
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
    return { ok: true, mode: "gmail_api", messageId: result.data.id };
  } catch (error) {
    logger.error(`[email:gmail_api] Send failed: ${error.message}`);
    return { ok: false, reason: "send_failed", mode: "gmail_api", error: error.message };
  }
}
