/**
 * JWT claims required by the frontend (jwt-decode on signin / profile update).
 */
export function buildAuthUserJwtPayload(user) {
  const id = user._id ?? user.id;
  return {
    id: id != null ? String(id) : "",
    email: user.email ?? "",
    username: user.username ?? "",
    tag: user.tag ?? "",
    profile_pic: user.profile_pic ?? "",
    invisible_mode: user.invisible_mode ?? false,
    notification_preferences: {
      direct_messages: true,
      friend_requests: true,
      server_messages: true,
      server_invites: true,
      ...(user.notification_preferences || {}),
    },
  };
}
