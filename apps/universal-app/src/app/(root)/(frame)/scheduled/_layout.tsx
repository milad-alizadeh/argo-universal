import type { ReactElement } from 'react';
import { SectionStack } from '@/navigation/section-stack';

export const unstable_settings = { anchor: 'index' };

export default function ScheduledLayout(): ReactElement {
  return <SectionStack section="scheduled" />;
}
