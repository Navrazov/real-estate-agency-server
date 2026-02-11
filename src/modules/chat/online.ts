const onlineUsers = new Set<string>();

export function setOnline(userId: string) {
  onlineUsers.add(userId);
}

export function setOffline(userId: string) {
  onlineUsers.delete(userId);
}

export function isOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}
