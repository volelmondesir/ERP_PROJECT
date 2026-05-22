const BASE_URL = "http://localhost:5000";

// 🔐 GET TOKEN
const getToken = () => localStorage.getItem("token");

// 🔥 GENERIC REQUEST
const request = async (endpoint: string, options: any = {}) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "API Error ❌");
  }

  return data;
};

// 🚀 METHODS
export const api = {
  get: (endpoint: string) => request(endpoint),

  post: (endpoint: string, body: any) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint: string, body: any) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (endpoint: string) =>
    request(endpoint, {
      method: "DELETE",
    }),
    
};