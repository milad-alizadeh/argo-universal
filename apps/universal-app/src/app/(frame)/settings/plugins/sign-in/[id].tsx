import { PluginSignInDetailScreen } from '@repo/client';
import { Redirect, useLocalSearchParams } from 'expo-router';
import type * as React from 'react';
import { z } from 'zod';

const SignInParams = z.object({
  id: z.string().min(1),
  page: z.string().startsWith('/'),
});

export default function PluginSignInRoute(): React.JSX.Element {
  const params = SignInParams.safeParse(useLocalSearchParams());

  return params.success ? (
    <PluginSignInDetailScreen
      pluginId={params.data.id}
      page={params.data.page}
    />
  ) : (
    <Redirect href="/settings/plugins" />
  );
}
