import { CalloutButton } from './callout-button';
import type { CalloutProps } from './callout-props';

const stderr = `Error: could not complete
  at step one
  at step two`;

export const infoCallout = {
  title: 'Nothing added yet',
  description: 'Press Add to get started.',
  actions: <CalloutButton label="Add" />,
} satisfies CalloutProps;

export const failedCallout = {
  tone: 'danger',
  title: 'Something failed',
  description: 'Exited with status 1',
  detail: stderr,
  actions: <CalloutButton label="Retry" />,
} satisfies CalloutProps;

export const busyCallout = {
  busy: true,
  title: 'Working…',
  actions: <CalloutButton variant="secondary" label="Cancel" />,
} satisfies CalloutProps;
