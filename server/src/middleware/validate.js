import { validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      status: 400,
      errors: errors.mapped(),
    });
  }

  next();
};

export default validate;
