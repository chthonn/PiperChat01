import config from "./index.js";

const corsOptions = {
  credentials: true,
  // Custom origin validation function
  origin: (requestOrigin, callback) => {
    if (requestOrigin && config.CORS_WHITELIST.includes(requestOrigin)) {
      return callback(null, true);
    } else {
      // In development allow all origins; other, block with an error
      if (config.NODE_ENV === "development") {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    }
  },
};

export default corsOptions;
