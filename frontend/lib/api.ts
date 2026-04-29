"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production" ? "/hr-api/api" : "http://127.0.0.1:8000/api");

function formatApiDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          const record = item as { loc?: unknown[]; msg?: unknown };
          const field = Array.isArray(record.loc) ? record.loc.filter((part) => part !== "body").join(".") : "";
          const message = typeof record.msg === "string" ? record.msg : "資料格式不正確";
          return field ? `${field}: ${message}` : message;
        }
        return String(item);
      })
      .join("；");
  }
  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return "請求失敗";
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("token");
}

export function setToken(token: string) {
  window.localStorage.setItem("token", token);
}

export function clearToken() {
  window.localStorage.removeItem("token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { detail?: unknown };
      throw new Error(formatApiDetail(payload.detail));
    }
    const error = await response.text();
    throw new Error(error || "請求失敗");
  }
  return response.json() as Promise<T>;
}

export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("下載失敗");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
