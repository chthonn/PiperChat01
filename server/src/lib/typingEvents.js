export function buildServerTypingEvent({ channel_id, server_id, from, username }) {
  if (!channel_id || !server_id || !from) {
    return null;
  }

  return {
    channel_id: String(channel_id),
    server_id: String(server_id),
    from: String(from),
    username: username ? String(username) : "",
  };
}
