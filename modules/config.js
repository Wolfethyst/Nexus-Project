// src/modules/config.js

export const API = "https://data.wolfethyst.tv";
export const OWNER_UUID = "7fea3331-7c36-49ac-975b-58de25ecf6ba";
export const INFINITE_POINTS = 999999999999;

// Video Configuration
export const CLOUDFLARE_CUSTOMER = "gc5hjo8ti1eiebgs"; 
export const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'%3E%3Crect width='640' height='360' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23555'%3EProcessing%3C/text%3E%3C/svg%3E";

export const DECO_DURATIONS = {
    "deco-pulse": 3000, "deco-gold": 3000, "deco-orbit": 4000, "deco-ethereal": 4000, "deco-glitch": 2000
};

export const STRIPE_PUBLISHABLE_KEY = "pk_live_51Sa1xwIBlzxfqwrlKe3BQ2jHqPritOhHeR5aOL7a7ZRlX7l4n83ZybvjCZubSkt7GwOGqRbM2OqxfgLbuVKLc7tP00vRbgVwYt";

// --- SHARED STATE ---
export const State = {
    user: null,
    isOwner: false,
    isModOrOwner: false,
    inventory: [],
    nexusRoles: [],
    nexusProfiles: {},
    points: 0
};

// --- HELPERS ---

export function escapeHtml(str) { return !str ? "" : str.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] || c)); }
export function formatCompact(n) { return n >= INFINITE_POINTS ? "∞" : (n >= 1000 ? (n/1000).toFixed(1) + "k" : n.toLocaleString()); }
export function getDisplayName(u) { return u?.display || u?.displayName || u?.name || u?.username || u?.login || "User"; }

export async function apiJson(path, options = {}) {
  const finalOptions = { credentials: "include", ...options };
  if (finalOptions.body && !(finalOptions.headers && finalOptions.headers["Content-Type"])) {
    finalOptions.headers = { ...(finalOptions.headers || {}), "Content-Type": "application/json" };
  }
  const res = await fetch(`${API}${path}`, finalOptions);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { res, data };
}

export function apiGet(path) { return apiJson(path); }
export function apiPost(path, body) { return apiJson(path, { method: "POST", body: JSON.stringify(body) }); }

export function showCustomConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmTitle');
  const msgEl = document.getElementById('confirmMessage');
  const yesBtn = document.getElementById('confirmYesBtn');
  const noBtn = document.getElementById('confirmNoBtn');

  if(titleEl) titleEl.innerText = title;
  if(msgEl) msgEl.innerText = message;
  if(modal) modal.classList.add('open');

  function closeAndCleanup() {
    if(modal) modal.classList.remove('open');
    if(yesBtn) yesBtn.onclick = null;
    if(noBtn) noBtn.onclick = null;
  }

  if(yesBtn) { yesBtn.onclick = () => { closeAndCleanup(); onConfirm(); }; }
  if(noBtn) { noBtn.onclick = () => { closeAndCleanup(); }; }
}