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
    try { await authApi.forgotPassword(email.trim()); setSent(true); setMessage('Verification code sent. Code expires in 10 minutes; requesting again replaces previous code.') }
    catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!sent) return send()
    if (password !== confirmation) { setError('Passwords do not match.'); return }
    if (busy) return
    setBusy(true); setError(null)
    try {
      await authApi.resetPassword({ email: email.trim(), otp, newPassword: password })
      setMessage('Password updated successfully. You can now close this window and sign in.')
      setPassword(''); setConfirmation(''); setOtp(''); setSent(false)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <>
    <Button type="button" variant="ghost" onClick={() => setOpen(true)}>Forgot password?</Button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false) }} title="Reset Password">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNotice message={error} />
        {message && <p role="status" className="text-sm">{message}</p>}
        <label className="block space-y-2"><span>Account Email</span><Input type="email" placeholder="name@fpt.edu.vn" required disabled={sent || busy} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        {sent && <>
          <label className="block space-y-2"><span>OTP Code</span><Input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value)} /></label>
          <label className="block space-y-2"><span>New Password</span><Input type="password" autoComplete="new-password" required minLength={12} maxLength={128} placeholder="Ít nhất 12 ký tự" value={password} onChange={e => setPassword(e.target.value)} /></label>
          <label className="block space-y-2"><span>Confirm New Password</span><Input type="password" autoComplete="new-password" required minLength={12} maxLength={128} placeholder="Ít nhất 12 ký tự" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void send()}>Resend Code</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => { setSent(false); setOtp(''); setMessage('') }}>Change Email</Button>
        </>}
        <Button type="submit" isLoading={busy}>{sent ? 'Reset Password' : 'Send Verification Code'}</Button>
      </form>
    </Modal>
  </>
}
