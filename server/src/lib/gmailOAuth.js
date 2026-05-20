import config from "../config/index.js";
import { OAuth2Client } from "google-auth-library";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function getMailUser() {
  return (config.EMAIL_USER || config.MAIL_USER || "").trim();
}

export function getOAuthClientId() {
  return (
    config.OAUTH_CLIENT_ID ||
    ""
  ).trim();
}

export function hasGmailOAuthCredentials() {
  return Boolean(
    getMailUser() &&
      getOAuthClientId() &&
      config.OAUTH_CLIENT_SECRET?.trim() &&
      config.OAUTH_REFRESH_TOKEN?.trim()
  );
}

export function createGmailOAuth2Client() {
  const client = new OAuth2Client(
    getOAuthClientId(),
    config.OAUTH_CLIENT_SECRET.trim()
  );
  client.setCredentials({
    refresh_token: config.OAUTH_REFRESH_TOKEN.trim(),
  });
  return client;
}
