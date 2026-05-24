import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import corsOptions from "./config/cors.js";
import routes from "./routes/index.js";

console.log("Initializing Express application...");

const app = express();

app.use(cors(corsOptions));
console.log("CORS middleware loaded");

app.use(helmet());
console.log("Helmet middleware loaded");

app.use(compression());
console.log("Compression middleware loaded");

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

console.log("Body parsers configured");

app.get("/", (req, res) => {
  console.log("Health check route accessed");

  res.status(200).json({
    success: true,
    message: "Server is up and running!",
    status: "ok",
  });
});

app.use("/api/v1", routes);

console.log("API routes mounted successfully");
console.log("Express app initialized successfully");

export default app;