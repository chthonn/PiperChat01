import config from "./index.js";

function validateOrigin(requestOrigin, callback) {
  // Health checks, curl, and server-to-server calls send no Origin header.
  if (!requestOrigin) {
    return callback(null, true);
  }

  if (config.CORS_WHITELIST.includes(requestOrigin)) {
    return callback(null, true);
  }

  if (config.NODE_ENV === "development") {
    return callback(null, true);
  }

  return callback(new Error("Not allowed by CORS"));
}

const corsOptions = {
  credentials: true,
  origin: validateOrigin,
};

export const socketCorsOptions = {
  credentials: true,
  origin: validateOrigin,
};

export default corsOptions;
