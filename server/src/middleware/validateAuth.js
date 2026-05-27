import { body, validationResult } from "express-validator";

export const validateEmail = [
  body("email")
    .exists()
    .withMessage("Email is required")

    .isString()
    .withMessage("Email must be a string")

    .trim()

    .isEmail()
    .withMessage("Invalid email format")

    .normalizeEmail(),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  },
];