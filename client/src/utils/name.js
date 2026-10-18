export const getName = (username, names = {}) => {
  if (!username) return "";
  if (names[username]) return names[username];
  return username.includes("@") ? username.split("@")[0] : username;
};