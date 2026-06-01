/**
 * dev-server.mjs
 *
 * Development startup script that spins up an in-memory MongoDB instance
 * when no real MONGO_URI is configured in the environment.
 *
 * Usage:
 *   node server/dev-server.mjs
 *   -- or via npm --
 *   npm run dev:local   (from the server/ directory)
 *
 * When MONGO_URI is already set (e.g. a real Atlas URI) the script skips
 * mongodb-memory-server and connects to that URI instead.
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load root .env first so any real MONGO_URI is picked up.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function startWithMemoryDb() {
  console.log(
    "⚠️  No MONGO_URI found — starting mongodb-memory-server for local dev."
  );

  // Dynamically import so the module is optional at runtime.
  const { MongoMemoryServer } = await import("mongodb-memory-server").catch(
    () => {
      console.error(
        "mongodb-memory-server is not installed. Run: npm install --save-dev mongodb-memory-server"
      );
      process.exit(1);
    }
  );

  const mongod = await MongoMemoryServer.create({
    instance: { dbName: "piperchat_dev" },
  });

  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  console.log("✅  In-memory MongoDB running at:", uri);
  console.log(
    "   NOTE: All data will be lost when the server stops (development only)."
  );

  // Ensure we shut the memory server down cleanly.
  process.on("SIGINT", async () => {
    await mongod.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await mongod.stop();
    process.exit(0);
  });
}

// Ensure a JWT secret exists for local dev.
if (!process.env.ACCESS_TOKEN) {
  process.env.ACCESS_TOKEN = "dev-only-insecure-secret-change-in-production";
  console.warn(
    "⚠️  ACCESS_TOKEN not set — using an insecure dev default. Set it in .env for production."
  );
}

// Decide whether to use the real MONGO_URI or spin up an in-memory one.
if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("<")) {
  await startWithMemoryDb();
}

// Dynamically import the real server entry point AFTER env vars are set.
await import("./index.js");
