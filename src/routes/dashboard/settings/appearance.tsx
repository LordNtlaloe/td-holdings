import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/settings/appearance')({
  component: AppearancePage,
})

import SettingsLayout from '@/layouts/settings/layout';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import AppLayout from '#/layouts/app-layout';

export default function AppearancePage() {
  return (
    <AppLayout>
      <SettingsLayout>
        <div className="space-y-6">
          <HeadingSmall
            title="Appearance settings"
            description="Update your account's appearance settings"
          />

          <AppearanceTabs />
        </div>
      </SettingsLayout>
    </AppLayout>
  );
}