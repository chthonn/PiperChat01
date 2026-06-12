import "dotenv/config";
import config from "./config/index.js";

import app from "./server.js";
import { Server as SocketIOServer } from "socket.io";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { attachSocketHandlers } from "./socket/index.js";
import { setIO } from "./socket/runtime.js";
import { verifyMailTransport } from "./services/email.js";

import { socketCorsOptions } from "./config/cors.js";
import logger, { logtail } from "./lib/winston.js";

let server;

(async function startServer() {
  try {
    console.log("Starting backend server...");

    console.log("Connecting to database...");
    await connectDatabase();
    console.log("Database connected successfully");

    console.log("Verifying mail transport...");
    await verifyMailTransport();
    console.log("Mail transport verified");

    console.log("Starting HTTP server...");

    server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      logger.info(`Server running on port ${config.PORT}`);
    });

    console.log("Initializing Socket.IO...");

    const io = new SocketIOServer(server, {
      pingTimeout: 20000,
      cors: socketCorsOptions,
    });

    setIO(io);

    attachSocketHandlers(io);

    console.log("Socket.IO initialized successfully");
    console.log("Backend startup completed successfully");
  } catch (error) {
    console.error("Startup error:", error.message);

    logger.error(`Failed to start server: ${error.message}`);

    if (config.NODE_ENV === "production") process.exit(1);
  }
})();

// Graceful shutdown
const serverTermination = async (signal) => {
  try {
    console.log(`${signal} received. Starting graceful shutdown...`);

    logger.warn(`${signal} received. Shutting down gracefully...`);

    console.log("Disconnecting database...");
    await disconnectDatabase();
    console.log("Database disconnected");

    if (server) {
      console.log("Closing HTTP server...");

      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);

          console.log("HTTP server closed");
          logger.info("HTTP server closed");

          resolve();
        });
      });
    }

    if (logtail) {
      console.log("Flushing logs...");
      await logtail.flush();
    }

    console.log("Graceful shutdown completed");

    process.exit(0);
  } catch (error) {
    console.error("Shutdown error:", error.message);

    logger.error(`Error during server shutdown: ${error.message}`);

    process.exit(1);
  }
};

process.on("SIGTERM", serverTermination);
process.on("SIGINT", serverTermination);