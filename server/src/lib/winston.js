import { createLogger, format, transports } from "winston";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

import config from "../config/index.js";

const loggerTransports = [];

const { combine, colorize, timestamp, printf } = format;

loggerTransports.push(
  new transports.Console({
    handleExceptions: true,

    format: combine(
      colorize({ all: true }),

      timestamp({
        format: "DD MMMM hh:mm:ss A",
      }),

      printf(({ level, message, timestamp }) => {
        return `${timestamp} [${level}]: ${message}`;
      }),
    ),
  }),
);

let logtail;

if (config.NODE_ENV === "production") {
  if (!config.LOGTAIL_SOURCE_TOKEN || !config.LOGTAIL_INGESTING_HOST) {
    throw new Error("Logtail source token or ingesting host is missing");
  }

  logtail = new Logtail(config.LOGTAIL_SOURCE_TOKEN, {
    endpoint: config.LOGTAIL_INGESTING_HOST,
  });

  loggerTransports.push(new LogtailTransport(logtail));
}

const logger = createLogger({
  level: config.NODE_ENV === "development" ? "debug" : "info",

  transports: loggerTransports,
});

export default logger;
export { logtail };
