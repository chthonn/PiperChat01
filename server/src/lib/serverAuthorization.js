export function getServerMember(server, userId) {
  return (server?.users || []).find(
    (member) => String(member.user_id) === String(userId),
  );
}

export function isServerOwner(server, userId) {
  return getServerMember(server, userId)?.user_role === "author";
}

export function canLeaveServer(server, userId) {
  return Boolean(getServerMember(server, userId)) && !isServerOwner(server, userId);
}

export function canRemoveServerMember(server, ownerId, memberId) {
  return (
    isServerOwner(server, ownerId) &&
    String(ownerId) !== String(memberId) &&
    Boolean(getServerMember(server, memberId))
  );
}
