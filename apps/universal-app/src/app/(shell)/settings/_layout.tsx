import { settingsTitles } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { SectionStack } from '@/navigation/section-stack';

// A page opened directly still has the list below it to go back to on a narrow window.
export const unstable_settings = { anchor: 'index' };

// Pages with a fixed title name it here; a Project or Agent page names itself.
export default function SettingsLayout(): React.JSX.Element {
  return (
    <SectionStack>
      {Object.entries(settingsTitles).map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </SectionStack>
  );
}
