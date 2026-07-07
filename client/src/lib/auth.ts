import { User } from "./types";

export interface AuthResponse {
  user: User;
  token: string;
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("authToken", token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("authToken");
};

export const getAuthHeaders = () : Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};
