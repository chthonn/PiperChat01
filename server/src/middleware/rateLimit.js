import config from "../config/index.js";

import { rateLimit } from "express-rate-limit";

const rateLimitHandler = (req, res, next, options) => {
  return res.status(options.statusCode).json({
    status: options.statusCode,
    message: options.message,
  });
};

const defaultLimitOpt = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  legacyHeaders: false,
  standardHeaders: true,
  handler: rateLimitHandler,
};

const rateLimitOpt = new Map([
  [
    "basic",
    {
      ...defaultLimitOpt,
      limit: 100,
      message: "Too many requests. Please try again later.",
    },
  ],
  [
    "auth",
    {
      ...defaultLimitOpt,
      limit: 10,
      message: "Too many authentication attempts. Please try again later.",
    },
  ],
  [
    "otp",
    {
      ...defaultLimitOpt,
      limit: 3,
      message: "Too many OTP requests. Please wait before trying again.",
    },
  ],
  [
    "chat",
    {
      ...defaultLimitOpt,
      windowMs: 60 * 1000,
      limit: 30,
      message: "You are sending messages too quickly.",
    },
  ],
]);

const expressRateLimit = (type = "basic") => {
  return rateLimit(rateLimitOpt.get(type) || rateLimitOpt.get("basic"));
};

export default expressRateLimit;
