import { GuestGuard } from '#/components/auth/auth-guard';
import { SigninForm } from '#/components/auth/sign-in';
import AuthLayout from '#/layouts/auth-layout';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/sign-in')({
  component: RouteComponent,
})

function RouteComponent() {
  return SignIn();
}

export default function SignIn() {
  return (
    <GuestGuard>
      <AuthLayout title={'Sign Authentication Form'} description={'Authentication'}>
        <SigninForm />
      </AuthLayout>
    </GuestGuard>
  )
}