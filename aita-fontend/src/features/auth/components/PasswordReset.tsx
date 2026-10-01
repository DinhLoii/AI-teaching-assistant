'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ErrorNotice } from '@/components/ui/feedback'
import { authApi } from '@/lib/api/modules/auth'
import { errorMessage } from '@/lib/api/errors'

export function PasswordReset() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  async function send() {
    if (busy) return
    setBusy(true); setError(null); setMessage('')
    try { await authApi.forgotPassword(email.trim()); setSent(true); setMessage('Đã gửi mã xác thực. Mã hết hạn sau 10 phút; gửi lại sẽ thay thế mã trước.') }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!sent) return send()
    if (password !== confirmation) { setError('Mật khẩu xác nhận chưa khớp.'); return }
    if (busy) return
    setBusy(true); setError(null)
    try {
      await authApi.resetPassword({ email: email.trim(), otp, newPassword: password })
      setMessage('Đã đổi mật khẩu. Bạn có thể đóng hộp thoại và đăng nhập.')
      setPassword(''); setConfirmation(''); setOtp(''); setSent(false)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <>
    <Button type="button" variant="ghost" onClick={() => setOpen(true)}>Quên mật khẩu?</Button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false) }} title="Khôi phục mật khẩu">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNotice message={error} />
        {message && <p role="status" className="text-sm">{message}</p>}
        <label className="block space-y-2"><span>Email tài khoản</span><Input type="email" required disabled={sent || busy} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {sent && <>
          <label className="block space-y-2"><span>Mã OTP</span><Input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} /></label>
          <label className="block space-y-2"><span>Mật khẩu mới</span><Input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="block space-y-2"><span>Xác nhận mật khẩu</span><Input type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void send()}>Gửi lại mã</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { setSent(false); setOtp(''); setMessage('') }}>Đổi email</Button>
        </>}
        <Button type="submit" isLoading={busy}>{sent ? 'Đặt lại mật khẩu' : 'Gửi mã xác thực'}</Button>
      </form>
    </Modal>
  </>
}
