const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 10 * 60 * 1000; // 10 minutes

export { OTP_TTL_MS };
