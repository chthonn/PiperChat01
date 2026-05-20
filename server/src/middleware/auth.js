import config from "../config/index.js";
import jwt from "jsonwebtoken";

export const authToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["x-auth-token"];
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided", status: 401 });
    }
    const decoded = jwt.verify(authHeader, config.ACCESS_TOKEN);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", status: 401 });
  }
};
