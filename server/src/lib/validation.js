export const MESSAGE_MAX_LENGTH = 2000;
export const SERVER_NAME_MAX_LENGTH = 100;

function validateTrimmedString(value, maxLength, fieldName) {
  if (typeof value !== "string") {
    return { valid: false, message: `${fieldName} is required` };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, message: `${fieldName} cannot be empty` };
  }

  if (value.length > maxLength) {
    return {
      valid: false,
      message: `${fieldName} must be ${maxLength} characters or fewer`,
    };
  }

  return { valid: true, value: trimmed };
}

export function validateMessageContent(content) {
  return validateTrimmedString(content, MESSAGE_MAX_LENGTH, "Message");
}

export function validateServerName(name) {
  return validateTrimmedString(name, SERVER_NAME_MAX_LENGTH, "Server name");
}
