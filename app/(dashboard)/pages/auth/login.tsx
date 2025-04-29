"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { Head } from '@/components/general/head';
import TextLink from '@/components/general/text-link';
import InputError from '@/components/general/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginProps {
  status?: string;
  canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrors({});

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors || {});
      } else {
        router.push('/dashboard'); // Redirect to dashboard after successful login
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AuthLayout title="Log in to your account" description="Enter your email and password below to log in">
      <Head title="Log in" />

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              required
              autoFocus
              tabIndex={1}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <InputError message={errors.email} />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              {canResetPassword && (
                <TextLink href="/forgot-password" className="ml-auto text-sm" tabIndex={5}>
                  Forgot password?
                </TextLink>
              )}
            </div>
            <Input
              id="password"
              type="password"
              required
              tabIndex={2}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <InputError message={errors.password} />
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="remember"
              name="remember"
              checked={remember}
              onClick={() => setRemember(!remember)}
              tabIndex={3}
            />
            <Label htmlFor="remember">Remember me</Label>
          </div>

          <Button type="submit" className="mt-4 w-full" tabIndex={4} disabled={processing}>
            {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
            Log in
          </Button>
        </div>

        <div className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{' '}
          <TextLink href="/register" tabIndex={5}>
            Sign up
          </TextLink>
        </div>
      </form>

      {status && (
        <div className="mb-4 text-center text-sm font-medium text-green-600">
          {status}
        </div>
      )}
    </AuthLayout>
  );
}
