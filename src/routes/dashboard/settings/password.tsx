import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useRequestPasswordReset, useResetPassword } from '#/lib/api/hooks'
import InputError from '@/components/input-error'
import SettingsLayout from '@/layouts/settings/layout'
import HeadingSmall from '@/components/heading-small'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AppLayout from '#/layouts/app-layout'

export const Route = createFileRoute('/dashboard/settings/password')({
  component: PasswordPage,
})

export default function PasswordPage() {
  const requestReset = useRequestPasswordReset()
  const resetPassword = useResetPassword()

  // step: "request" → enter email; "verify" → enter OTP + new password
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)
    try {
      await requestReset({ email })
      setStep('verify')
    } catch {
      setError('Could not send reset code. Check the email and try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError(null)
    try {
      await resetPassword({ email, code, newPassword })
      setSuccess(true)
      setStep('request')
      setEmail('')
      setCode('')
      setNewPassword('')
    } catch {
      setError('Invalid or expired code. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AppLayout>
      <SettingsLayout>
        <div className="space-y-6">
          <HeadingSmall
            title="Reset password"
            description={
              step === 'request'
                ? 'Enter your email to receive a reset code'
                : `Enter the code sent to ${email} and your new password`
            }
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Password reset successfully. You can now sign in with your new password.
            </div>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-6">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  disabled={processing}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={processing || !email}>
                {processing ? 'Sending...' : 'Send reset code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="grid gap-2">
                <Label>Reset code</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  type="text"
                  inputMode="numeric"
                  disabled={processing}
                  placeholder="12345678"
                  required
                />
                <InputError message={undefined} />
              </div>
              <div className="grid gap-2">
                <Label>New password</Label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={processing}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={processing || !code || !newPassword}>
                  {processing ? 'Resetting...' : 'Reset password'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep('request'); setError(null) }}
                >
                  Back
                </Button>
              </div>
            </form>
          )}
        </div>
      </SettingsLayout>
    </AppLayout>
  )
}