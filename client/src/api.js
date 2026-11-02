// Central API helper
const API_BASE = "";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("erp_token");

  const headers = {
    ...options.headers,
  };

  // If not sending FormData, set JSON content-type
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: "GET" }),
  post: (endpoint, body) =>
    apiRequest(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body) =>
    apiRequest(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (endpoint, body) =>
    apiRequest(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (endpoint) => apiRequest(endpoint, { method: "DELETE" }),
};
