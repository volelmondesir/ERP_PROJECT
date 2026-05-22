export const can = (perm: string): boolean => {
  const raw = localStorage.getItem("user");
  if (!raw) return false;

  const user = JSON.parse(raw);

  console.log("CHECK:", perm, user.permissions);

  if (user?.role === "admin") return true;

  return user.permissions.includes(perm);
};