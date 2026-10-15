import type * as React from 'react';
import { SectionStack } from '@/navigation/section-stack';

// A page opened directly still has the list below it to go back to on a narrow window.
export const unstable_settings = { anchor: 'index' };

// Each page names itself.
export default function SettingsLayout(): React.JSX.Element {
  return <SectionStack section="settings" />;
}
