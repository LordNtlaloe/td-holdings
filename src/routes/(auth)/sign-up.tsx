import { GuestGuard } from '#/components/auth/auth-guard'
import { SignupForm } from '#/components/auth/sign-up'
import AuthLayout from '#/layouts/auth-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <GuestGuard>
      <AuthLayout title={'Sign Authentication Form'} description={'Authentication'}>
        <SignupForm />
      </AuthLayout>
    </GuestGuard>
  )
}
