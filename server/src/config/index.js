/**
 * Constants
 */
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 10 * 60 * 1000; // 10 minutes

const config = {
  PORT: process.env.PORT || 2000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI,
  ACCESS_TOKEN: process.env.ACCESS_TOKEN,
  DICEBEAR_API: process.env.DICEBEAR_API,
  DICEBEAR_STYLE: process.env.DICEBEAR_STYLE,
  DEFAULT_PROFILE_PIC: process.env.DEFAULT_PROFILE_PIC,
  EMAIL_USER: process.env.MAIL_USER,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_TRANSPORT: process.env.MAIL_TRANSPORT,
  MAIL_PASS: process.env.MAIL_PASS,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
  OAUTH_REFRESH_TOKEN: process.env.OAUTH_REFRESH_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
  REDIS_CACHE_TTL_SECONDS: Number(process.env.REDIS_CACHE_TTL_SECONDS) || 30,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  CORS_WHITELIST: (
    process.env.FRONTEND_ORIGINS ||
    "http://localhost:3000,http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  OTP_TTL_MS,
  UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
  UPSTASH_REDIS_TLS_URL: process.env.UPSTASH_REDIS_TLS_URL,
  RATE_LIMIT_WINDOW_MS:
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  LOGTAIL_SOURCE_TOKEN: process.env.LOGTAIL_SOURCE_TOKEN,
  LOGTAIL_INGESTING_HOST: process.env.LOGTAIL_INGESTING_HOST,
};

export default config;
