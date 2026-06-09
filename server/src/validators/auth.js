import {
  dobValidator,
  emailValidator,
  otpValidator,
  passwordValidator,
  strongPasswordValidator,
  usernameValidator,
} from "./commonValidators.js";

export const signupValidator = [
  usernameValidator(),
  emailValidator(),
  strongPasswordValidator(),
  dobValidator(),
];

export const signinValidator = [emailValidator(), passwordValidator()];

export const verifyOtpValidator = [emailValidator(), otpValidator()];

export const resendOtpValidator = [emailValidator()];
