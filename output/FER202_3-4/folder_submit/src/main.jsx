import React, {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

function Field({id,label,type='text',value,onChange}) {
  return <label htmlFor={id}>{label}<input id={id} data-testid={id} type={type} value={value} onChange={e=>onChange(e.target.value)} /></label>;
}
function Register() {
  const [name,setName]=useState(''),[email,setEmail]=useState('');
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState('');
  function submit(e) {
    e.preventDefault();
    if(name.trim().length<2) {setError('Họ tên phải từ 2 ký tự.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {setError('Email không hợp lệ.');return;}
    setError('Chức năng tạo tài khoản chưa hoàn thành.');
  }
  return <section data-testid="register-page"><h1>Đăng ký tài khoản</h1><form noValidate onSubmit={submit}>
    <Field id="register-name" label="Họ và tên" value={name} onChange={setName}/>
    <Field id="register-email" label="Email" type="email" value={email} onChange={setEmail}/>
    <Field id="register-password" label="Mật khẩu" type="password" value={password} onChange={setPassword}/>
    <Field id="register-confirm" label="Xác nhận mật khẩu" type="password" value={confirm} onChange={setConfirm}/>
    {error&&<p role="alert" data-testid="register-error">{error}</p>}
    <button data-testid="register-submit">Đăng ký</button>
  </form><a href="#login">Đã có tài khoản? Đăng nhập</a></section>;
}
function Login() {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState('');
  return <section data-testid="login-page"><h1>Đăng nhập</h1><form noValidate onSubmit={e=>{e.preventDefault();setMessage('Chức năng đăng nhập chưa hoàn thành.');}}>
    <Field id="login-email" label="Email" type="email" value={email} onChange={setEmail}/>
    <Field id="login-password" label="Mật khẩu" type="password" value={password} onChange={setPassword}/>
    {message&&<p role="alert" data-testid="login-error">{message}</p>}
    <button data-testid="login-submit">Đăng nhập</button>
  </form><a href="#register">Chưa có tài khoản? Đăng ký</a></section>;
}
function App() {
  const [route,setRoute]=useState(location.hash||'#login');
  useEffect(()=>{const change=()=>setRoute(location.hash||'#login');addEventListener('hashchange',change);return()=>removeEventListener('hashchange',change);},[]);
  return <main><header><strong>FER202</strong><span>Bài thực hành React</span></header>{route==='#register'?<Register/>:route==='#dashboard'?<section><h1>Trang cá nhân</h1><p>Chức năng này chưa hoàn thành.</p><a href="#login">Quay lại đăng nhập</a></section>:<Login/>}</main>;
}
createRoot(document.getElementById('root')).render(<App/>);
