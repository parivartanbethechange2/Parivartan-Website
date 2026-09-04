import axios from "axios";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const fmt = (n) => new Intl.NumberFormat("en-IN").format(n);
export const inr = (n) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;
