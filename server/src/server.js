import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import corsOptions from "./config/cors.js";

import routes from "./routes/index.js";

const app = express();

app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is up and running!",
    status: "ok",
  });
});

app.use("/api/v1", routes);

export default app;
