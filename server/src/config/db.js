import mongoose from "mongoose";

import config from "./index.js";
import logger from "../lib/winston.js";

const connectionOptions = {
  serverSelectionTimeoutMS: 8000,

  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
};

mongoose.set("strictQuery", true);

const connectDatabase = async (options = {}) => {
  if (!config.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  try {
    await mongoose.connect(config.MONGO_URI, {
      ...connectionOptions,
      ...options,
    });

    logger.info("Database connected successfully");
  } catch (error) {
    if (error.message?.includes("auth")) {
      logger.error(
        "[MongoDB] Authentication failed. Check if special characters in the password are URL-encoded.",
      );
    }

    logger.error(`Failed to connect database: ${error.message}`);

    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();

    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error(`Error during database disconnection: ${error.message}`);

    throw error;
  }
};

export { connectDatabase, disconnectDatabase };
