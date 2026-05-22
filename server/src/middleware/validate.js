import { validationResult } from "express-validator";

export const validate = (rules) => async (req, res, next) => {
  await Promise.all(rules.map((rule) => rule.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 400,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  next();
};
