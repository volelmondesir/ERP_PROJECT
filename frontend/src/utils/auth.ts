export const getUser = () => {
  try {
    const data = localStorage.getItem("user");
    if (!data) return null;
    return JSON.parse(data);
  } catch (err) {
    localStorage.removeItem("user");
    return null;
  }
};

export const can = (module: string, action: string) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const perms = user.permissions?.[module] || [];

    return perms.includes(action);
  } catch {
    return false;
  }
};

export const getToken = () => {
  return localStorage.getItem("token");
};