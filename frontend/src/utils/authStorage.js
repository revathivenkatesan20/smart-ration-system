/**
 * auth-storage.js
 * 
 * Wraps sessionStorage for auth tokens so each browser tab
 * maintains its own independent login session.
 * 
 * Non-auth preferences (like language) remain in localStorage
 * so they persist across tabs and page refreshes.
 */

// Auth keys stored per-tab in sessionStorage
const AUTH_KEYS = ['token', 'role', 'rationCardNumber', 'userName', 'shopId', 'shopName'];

export const authStorage = {
  getItem: (key) => sessionStorage.getItem(key),
  setItem: (key, value) => sessionStorage.setItem(key, value),
  removeItem: (key) => sessionStorage.removeItem(key),
  clear: () => {
    // Only clear auth keys, preserve preferences (lang, etc.)
    AUTH_KEYS.forEach(k => sessionStorage.removeItem(k));
  }
};
