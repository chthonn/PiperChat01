import config from "../config/index.js";

import nodemailer from "nodemailer";
import {
  getMailUser,
  getOAuthClientId,
  hasGmailOAuthCredentials,
} from "../lib/gmailOAuth.js";
import logger from "../lib/winston.js";
import { sendOtpViaGmailApi, verifyGmailApi } from "./gmailApiMail.js";

const MAIL_MODES = {
  CONSOLE: "console",
  GMAIL_API: "gmail_api",
  PASSWORD: "password",
  SMTP: "smtp",
  NONE: "none",
};

function hasSmtpCredentials() {
  const smtpHost = config.SMTP_HOST?.trim();
  const smtpUser = (config.SMTP_USER || getMailUser()).trim();
  const smtpPass = (config.SMTP_PASS || config.MAIL_PASS || "").trim();
  return Boolean(smtpHost && smtpUser && smtpPass);
}

function hasPasswordCredentials() {
  return Boolean(getMailUser() && config.MAIL_PASS?.trim());
}

/**
 * gmail_api = Gmail REST API over HTTPS (port 443) — use in production.
 * Nodemailer still uses SMTP and may ETIMEDOUT on cloud hosts that block outbound SMTP.
 */
export function resolveMailMode() {
  const requested = (config.MAIL_TRANSPORT || "auto").trim().toLowerCase();

  if (requested === "console") return MAIL_MODES.CONSOLE;

  if (
    requested === "gmail_api" ||
    requested === "gmail_oauth2" ||
    requested === "oauth2"
  ) {
    return hasGmailOAuthCredentials() ? MAIL_MODES.GMAIL_API : MAIL_MODES.NONE;
  }

  if (requested === "gmail" || requested === "gmail_password" || requested === "password") {
    return hasPasswordCredentials() ? MAIL_MODES.PASSWORD : MAIL_MODES.NONE;
  }

  if (requested === "smtp") {
    return hasSmtpCredentials() ? MAIL_MODES.SMTP : MAIL_MODES.NONE;
  }

  // auto: Gmail API when OAuth is configured , else local SMTP/password
  if (hasGmailOAuthCredentials()) return MAIL_MODES.GMAIL_API;
  if (hasSmtpCredentials()) return MAIL_MODES.SMTP;
  if (hasPasswordCredentials()) return MAIL_MODES.PASSWORD;
  return MAIL_MODES.NONE;
}

function createNodemailerTransporter(mode) {
  if (mode === MAIL_MODES.PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: getMailUser(), pass: config.MAIL_PASS.trim() },
    });
  }

  if (mode === MAIL_MODES.SMTP) {
    const smtpPort = config.SMTP_PORT
      ? Number(config.SMTP_PORT)
      : undefined;
    return nodemailer.createTransport({
      host: config.SMTP_HOST.trim(),
      port: smtpPort || 587,
      secure:
        config.SMTP_SECURE === "true" ||
        config.SMTP_SECURE === "1" ||
        smtpPort === 465,
      auth: {
        user: (config.SMTP_USER || getMailUser()).trim(),
        pass: (config.SMTP_PASS || config.MAIL_PASS).trim(),
      },
    });
  }

  return null;
}

function buildNodemailerOptions(to, name, otp) {
  const fromAddress = getMailUser();
  const displayName = name || "there";
  return {
    from: `"PiperChat" <${fromAddress}>`,
    to,
    subject: "Your PiperChat verification code",
    text: `Hello ${displayName},\n\nYour PiperChat verification code is: ${otp}\n`,
    html: `<p>Hello ${displayName},</p><p>Your verification code: <strong>${otp}</strong></p>`,
  };
}

export async function verifyMailTransport() {
  const mode = resolveMailMode();

  if (mode === MAIL_MODES.CONSOLE) {
    logger.info("[email] MAIL_TRANSPORT=console — OTP emails are logged only.");
    return { ok: true, mode };
  }

  if (mode === MAIL_MODES.NONE) {
    logger.warn(
      "[email] Not configured. Set MAIL_TRANSPORT=gmail_api and Gmail OAuth env vars."
    );
    return { ok: false, mode, reason: "mail_not_configured" };
  }

  if (mode === MAIL_MODES.GMAIL_API) {
    const result = await verifyGmailApi();
    if (result.ok) {
      logger.info(`[email] Gmail API ready as ${result.address}`);
      return { ok: true, mode };
    }
    logger.error(`[email] Gmail API verification failed: ${result.reason}`);
    if (result.hint) logger.error(`[email] ${result.hint}`);
    return { ok: false, mode, ...result };
  }

  const transporter = createNodemailerTransporter(mode);
  try {
    await transporter.verify();
    logger.info(`[email] SMTP ready (${mode}) as ${getMailUser()}`);
    return { ok: true, mode };
  } catch (error) {
    logger.error(`[email] SMTP verify failed (${mode}): ${error.message}`);
    if (error.code === "ETIMEDOUT") {
      logger.error(
        "[email] SMTP is blocked on this host. Use MAIL_TRANSPORT=gmail_api with OAuth2."
      );
    }
    return { ok: false, mode, reason: "verify_failed" };
  }
}

async function sendMail(otp, mailValue, nameValue) {
  const mode = resolveMailMode();

  if (mode === MAIL_MODES.CONSOLE) {
    logger.info(`[email:console] OTP for ${mailValue}: ${otp}`);
    return { ok: true, mode, simulated: true };
  }

  if (mode === MAIL_MODES.GMAIL_API) {
    return sendOtpViaGmailApi(otp, mailValue, nameValue);
  }

  const transporter = createNodemailerTransporter(mode);
  if (!transporter) {
    logger.warn("[email] Mail not configured.");
    return { ok: false, reason: "mail_not_configured", mode };
  }

  try {
    const info = await transporter.sendMail(
      buildNodemailerOptions(mailValue, nameValue, otp)
    );
    return { ok: true, mode, messageId: info.messageId };
  } catch (error) {
    logger.error(`[email] Send failed (${mode}): ${error.message}`);
    if (error.code === "ETIMEDOUT") {
      logger.error(
        "[email] Use MAIL_TRANSPORT=gmail_api (SMTP ports are often blocked in production)."
      );
    }
    return { ok: false, reason: "send_failed", mode, error: error.message };
  }
}

function generateOTP() {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 4; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

export { sendMail, generateOTP, MAIL_MODES };
