// จัดการ localStorage ทั้งหมดของแอป — ทุกฟังก์ชันปลอดภัยแม้ storage ถูกปิด (private mode)

const PREFIX = 'aiq:';
export const KEYS = {
  theme: `${PREFIX}theme`,
  history: `${PREFIX}history`,
  session: (mode) => `${PREFIX}session:${mode}`,
};
const MAX_HISTORY = 100;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ---------- ประวัติการทำข้อสอบ ---------- */

export function getHistory() {
  const h = read(KEYS.history, []);
  return Array.isArray(h) ? h : [];
}

export function saveAttempt(attempt) {
  const history = getHistory();
  history.push(attempt);
  write(KEYS.history, history.slice(-MAX_HISTORY));
  return attempt.id;
}

/** id ว่าง = ครั้งล่าสุด */
export function getAttempt(id) {
  const history = getHistory();
  if (!id) return history[history.length - 1] ?? null;
  return history.find((a) => a.id === id) ?? null;
}

export function clearHistory() {
  remove(KEYS.history);
}

/* ---------- session ที่ทำค้างไว้ (practice / exam) ---------- */

export function getSession(mode) {
  return read(KEYS.session(mode), null);
}

export function saveSession(mode, state) {
  return write(KEYS.session(mode), state);
}

export function clearSession(mode) {
  remove(KEYS.session(mode));
}

/* ---------- ธีม ---------- */

export function getTheme() {
  try {
    return localStorage.getItem(KEYS.theme);
  } catch {
    return null;
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    /* ignore */
  }
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
