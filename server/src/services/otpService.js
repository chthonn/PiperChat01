import config from "../config/index.js";
import { del, getJson, setJson } from "../lib/cache.js";

const OTP_KEY_PREFIX = "auth:otp:";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function otpKey(email) {
  return `${OTP_KEY_PREFIX}${normalizeEmail(email)}`;
}

function getOtpTtlSeconds() {
  return Math.ceil(config.OTP_TTL_MS / 1000);
}

export async function storeOtp(email, otp) {
  return setJson(otpKey(email), { code: otp }, getOtpTtlSeconds());
}

export async function getStoredOtp(email) {
  const data = await getJson(otpKey(email));
  return typeof data?.code === "string" ? data.code : null;
}

export async function deleteOtp(email) {
  return del(otpKey(email));
}
