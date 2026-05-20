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
    await connectDatabase();
    await verifyMailTransport();

    server = app.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT}`);
    });

    const io = new SocketIOServer(server, {
      pingTimeout: 20000,
      cors: socketCorsOptions,
    });
    setIO(io);
    attachSocketHandlers(io);
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    if (config.NODE_ENV === "production") process.exit(1);
  }
})();

// Handle graceful shutdown on termination signals
const serverTermination = async (signal) => {
  try {
    // Log a warning indicating the server is shutting down
    logger.warn(`${signal} received. Shutting down gracefully...`);

    // Disconnect from the database
    await disconnectDatabase();

    // Close http server
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);

          logger.info("HTTP server closed");
          resolve();
        });
      });
    }

    // Flush any remaining log to Logtail before exiting
    if (logtail) {
      await logtail.flush();
    }

    // Exit the process cleanly
    process.exit(0);
  } catch (error) {
    logger.error(`Error during server shutdown: ${error.message}`);
    process.exit(1);
  }
};

// Listen for the termination signals and trigger graceful shutdown
process.on("SIGTERM", serverTermination);
process.on("SIGINT", serverTermination);
