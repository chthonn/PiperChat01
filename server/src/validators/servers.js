import { body } from "express-validator";
import {
  channelNameValidator,
  serverIdValidator,
} from "./commonValidators.js";

export const createServerValidator = [
  body("server_details")
    .notEmpty()
    .withMessage("Server details are required")
    .isObject()
    .withMessage("Server details must be an object"),

  body("server_details.role")
    .trim()
    .notEmpty()
    .withMessage("Server role is required"),

  body("server_image")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Server image must be a string"),
];

export const serverInfoValidator = [
  serverIdValidator(),
];

export const addNewChannelValidator = [
  body("category_id")
    .trim()
    .notEmpty()
    .withMessage("Category ID is required"),

  channelNameValidator(),

  body("channel_type")
    .trim()
    .notEmpty()
    .withMessage("Channel type is required"),

  serverIdValidator(),
];

export const addNewCategoryValidator = [
  body("category_name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Category name must be between 1 and 100 characters"),

  serverIdValidator(),
];

export const deleteServerValidator = [
  serverIdValidator(),
];

export const leaveServerValidator = [
  serverIdValidator(),
];