import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { registerAccount, loginAccount, logoutAccount, currentSession } from './auth.js';
import './style.css';

function Field({ id, label, type = 'text', value, onChange, autoComplete, maxLength }) {
  return <label className="field" htmlFor={id}><span>{label}</span><input id={id} data-testid={id} type={type} value={value} onChange={event => onChange(event.target.value)} autoComplete={autoComplete} maxLength={maxLength} required /></label>;
}
function Register({ onRegistered }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setError(''); setBusy(true);
    try { const profile = await registerAccount({ fullName, email, password, confirmPassword }); onRegistered(profile); }
    catch (failure) { setError(failure.message || 'Không thể đăng ký. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <section data-testid="register-page"><p className="eyebrow">BẮT ĐẦU HÀNH TRÌNH</p><h1>Tạo tài khoản</h1><p className="subtitle">Đăng ký để trải nghiệm Campus Portal.</p><form noValidate onSubmit={submit}>
    <Field id="register-name" label="Họ và tên" value={fullName} onChange={setFullName} autoComplete="name" maxLength={80} />
    <Field id="register-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
    <Field id="register-password" label="Mật khẩu" type="password" value={password} onChange={setPassword} autoComplete="new-password" maxLength={64} />
    <p className="hint">Từ 8 đến 64 ký tự.</p>
    <Field id="register-confirm" label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" maxLength={64} />
    {error && <p role="alert" data-testid="register-error">{error}</p>}
    <button className="primary" data-testid="register-submit" disabled={busy}>{busy ? 'Đang tạo tài khoản…' : 'Đăng ký'}</button>
  </form><p className="switch">Đã có tài khoản? <a href="#login">Đăng nhập</a></p></section>;
}
function Login({ onLogin, initialEmail, notice }) {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setError(''); setBusy(true);
    try { onLogin(await loginAccount({ email, password })); }
    catch (failure) { setError(failure.message || 'Không thể đăng nhập.'); }
    finally { setBusy(false); }
  }
  return <section data-testid="login-page"><p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p><h1>Đăng nhập</h1><p className="subtitle">Một tài khoản, bắt đầu trải nghiệm của bạn.</p>
    {notice && <p className="notice" role="status" data-testid="auth-notice">{notice}</p>}
    <form noValidate onSubmit={submit}>
      <Field id="login-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" />
      <Field id="login-password" label="Mật khẩu" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p role="alert" data-testid="login-error">{error}</p>}
      <button className="primary" data-testid="login-submit" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form><p className="switch">Chưa có tài khoản? <a href="#register">Đăng ký ngay</a></p></section>;
}
function Dashboard({ profile, onLogout }) {
  return <section data-testid="dashboard-page"><span className="success-icon" aria-hidden="true">✓</span><p className="eyebrow">ĐĂNG NHẬP THÀNH CÔNG</p><h1>Xin chào, {profile.fullName}!</h1><p className="subtitle">Bạn đã vào trang cá nhân của mình.</p><dl className="profile"><dt>Họ tên</dt><dd data-testid="profile-name">{profile.fullName}</dd><dt>Email</dt><dd data-testid="profile-email">{profile.email}</dd><dt>Trạng thái</dt><dd><span className="badge">Đã đăng nhập</span></dd></dl><button className="primary" data-testid="logout" onClick={onLogout}>Đăng xuất</button></section>;
}
function App() {
  const [route, setRoute] = useState(location.hash || '#login');
  const [profile, setProfile] = useState(currentSession);
  const [notice, setNotice] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  useEffect(() => { const changed = () => setRoute(location.hash || '#login'); addEventListener('hashchange', changed); return () => removeEventListener('hashchange', changed); }, []);
  useEffect(() => {
    if (route === '#dashboard' && !profile) location.hash = 'login';
    if (profile && route !== '#dashboard') location.hash = 'dashboard';
  }, [route, profile]);
  function registered(user) { setRegisteredEmail(user.email); setNotice('Đăng ký thành công. Vui lòng đăng nhập.'); location.hash = 'login'; }
  function login(user) { setProfile(user); setNotice(''); location.hash = 'dashboard'; }
  function logout() { logoutAccount(); setProfile(null); setNotice('Bạn đã đăng xuất.'); location.hash = 'login'; }
  return <><header><a className="brand" href={profile ? '#dashboard' : '#login'}><span>CP</span> Campus Portal</a><span className="course">FER202</span></header><main className="layout"><aside><p className="eyebrow">LEARN. CONNECT. GROW.</p><h2>Khởi đầu nhỏ.<br />Trải nghiệm mới.</h2><p>Bài thực hành React với đăng ký, đăng nhập và trang cá nhân.</p><div className="feature"><span>01</span><div><strong>Tạo tài khoản</strong><p>Thông tin rõ ràng, thao tác đơn giản.</p></div></div><div className="feature"><span>02</span><div><strong>Đăng nhập và khám phá</strong><p>Trang cá nhân dành riêng cho bạn.</p></div></div><small>Mô phỏng xác thực frontend cho mục đích học tập.</small></aside><article className="card">{profile ? <Dashboard profile={profile} onLogout={logout} /> : route === '#register' ? <Register onRegistered={registered} /> : <Login onLogin={login} initialEmail={registeredEmail} notice={notice} />}</article></main><footer>Campus Portal · Bài thực hành FER202</footer></>;
}
createRoot(document.getElementById('root')).render(<App />);
