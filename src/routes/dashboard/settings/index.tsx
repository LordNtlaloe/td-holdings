import { useState, type FormEvent, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useApiQuery, useApiMutation } from '#/lib/api/hooks';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SettingsLayout from '@/layouts/settings/layout';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppLayout from '#/layouts/app-layout';

export const Route = createFileRoute('/dashboard/settings/')({
  component: ProfilePage,
});

function ProfilePage() {
  // Get current user data
  const { data: currentUser, isLoading } = useApiQuery<any>('users.getUserProfile', '/api/users/profile');
  const updateProfile = useApiMutation('users.updateUserProfile', 'PATCH', '/api/users/profile');

  const [data, setData] = useState({
    name: '',
    email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [recentlySuccessful, setRecentlySuccessful] = useState(false);

  // Update local state when user data loads
  useEffect(() => {
    if (currentUser) {
      setData({
        name: currentUser.name || '',
        email: currentUser.email || '',
      });
    }
  }, [currentUser]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    setProcessing(true);
    setErrors({});
    setRecentlySuccessful(false);

    try {
      const result = await updateProfile({
        name: data.name,
        // email: data.email,
      });

      if (result) {
        setRecentlySuccessful(true);
        setTimeout(() => {
          setRecentlySuccessful(false);
        }, 2000);
      } else {
        setErrors(errors || {});
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setErrors({ general: 'Failed to update profile. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const setField = (key: 'name' | 'email', value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-6">
          <HeadingSmall
            title="Profile information"
            description="Update your name and email address"
          />
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <AppLayout>
      <SettingsLayout>
        <div className="space-y-6">
          <HeadingSmall
            title="Profile information"
            description="Update your name and email address"
          />

          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-6">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                autoComplete="name"
                placeholder="Full name"
                disabled={processing}
              />
              <InputError message={errors.name} />
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                autoComplete="username"
                placeholder="Email address"
                disabled={processing}
              />
              <InputError message={errors.email} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={processing}>
                {processing ? 'Saving...' : 'Save'}
              </Button>

              {recentlySuccessful && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}
            </div>
          </form>
        </div>

        <DeleteUser />
      </SettingsLayout>
    </AppLayout>
  );
}