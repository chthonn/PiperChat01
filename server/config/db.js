import "./env.js";
import mongoose from "mongoose";

mongoose.set("strictQuery", true);

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw new Error("MONGO_URI is not set in .env");
}

export function connect(options = {}) {
  return mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      ...options,
    })
    .catch((err) => {
      if (err.message?.includes("auth")) {
        console.error(
          "[MongoDB] Auth failed. Check: special chars in password need URL-encoding (@ → %40, # → %23), and no spaces around = in .env"
        );
      }
      throw err;
    });
}