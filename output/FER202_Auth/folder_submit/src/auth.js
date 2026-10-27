const USERS_KEY = 'fer202.auth.users.v1';
const SESSION_KEY = 'fer202.auth.session.v1';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizedEmail = value => value.trim().toLowerCase();

export function validEmail(value) { return emailPattern.test(normalizedEmail(value)); }
function users() {
  try {
    const value = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function hex(bytes) { return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''); }
async function digest(password, salt) {
  if (!globalThis.crypto?.subtle) throw new Error('Hãy mở ứng dụng qua địa chỉ localhost để sử dụng bản thực hành.');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, material, 256);
  return hex(new Uint8Array(bits));
}
export async function registerAccount({ fullName, email, password, confirmPassword }) {
  const name = fullName.trim();
  const address = normalizedEmail(email);
  if (name.length < 2 || name.length > 80) throw new Error('Họ tên phải từ 2 đến 80 ký tự.');
  if (!validEmail(address)) throw new Error('Email không hợp lệ.');
  if (password.length < 8 || password.length > 64) throw new Error('Mật khẩu phải từ 8 đến 64 ký tự.');
  if (confirmPassword !== password) throw new Error('Xác nhận mật khẩu không khớp.');
  const current = users();
  if (current.some(user => user.email === address)) throw new Error('Email đã được đăng ký.');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await digest(password, salt);
  // Refresh after async hashing to avoid duplicates from another tab.
  const latest = users();
  if (latest.some(user => user.email === address)) throw new Error('Email đã được đăng ký.');
  localStorage.setItem(USERS_KEY, JSON.stringify([...latest, { fullName: name, email: address, salt, passwordHash }]));
  return { fullName: name, email: address };
}
export async function loginAccount({ email, password }) {
  if (!validEmail(email) || !password) throw new Error('Vui lòng nhập email hợp lệ và mật khẩu.');
  const user = users().find(account => account.email === normalizedEmail(email));
  if (!user || await digest(password, user.salt) !== user.passwordHash) throw new Error('Email hoặc mật khẩu không đúng.');
  const profile = { fullName: user.fullName, email: user.email };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  return profile;
}
export function currentSession() {
  try {
    const profile = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    return profile && typeof profile.fullName === 'string' && validEmail(profile.email || '') ? profile : null;
  } catch { return null; }
}
export function logoutAccount() { sessionStorage.removeItem(SESSION_KEY); }
