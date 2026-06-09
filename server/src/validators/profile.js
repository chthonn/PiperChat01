import { body } from "express-validator";

export const updateProfileValidator = [
  body("username")
    .optional({ values: "undefined" })
    .trim()
    .isLength({ min: 2, max: 32 })
    .withMessage("Username must be 2-32 characters."),

  body("profile_pic")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Profile picture must be a string")
    .isLength({ max: 2048 })
    .withMessage("Profile picture must be valid")
    .isURL({
      protocols: ["http", "https"],
      require_protocol: true,
    })
    .withMessage("Profile picture must be a valid http(s) URL or empty"),

  body().custom((value) => {
    if (value.username === undefined && value.profile_pic === undefined) {
      throw new Error("No changes");
    }

    return true;
  }),
];

export const updatePasswordValidator = [
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required")
    .isString()
    .withMessage("Current password must be a string"),

  body("new_password")
    .notEmpty()
    .withMessage("New password is required")
    .isString()
    .withMessage("New password must be a string")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters."),
];

export const updateNotificationPreferencesValidator = [
  body("direct_messages")
    .optional()
    .isBoolean()
    .withMessage("direct_messages must be a boolean"),

  body("friend_requests")
    .optional()
    .isBoolean()
    .withMessage("friend_requests must be a boolean"),

  body("server_messages")
    .optional()
    .isBoolean()
    .withMessage("server_messages must be a boolean"),

  body("server_invites")
    .optional()
    .isBoolean()
    .withMessage("server_invites must be a boolean"),

  body().custom((value) => {
    const allowed = [
      "direct_messages",
      "friend_requests",
      "server_messages",
      "server_invites",
    ];

    if (!allowed.some((key) => value[key] !== undefined)) {
      throw new Error("No preferences provided");
    }

    return true;
  }),
];
