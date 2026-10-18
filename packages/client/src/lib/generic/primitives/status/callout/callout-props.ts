import type { ReactNode } from 'react';

export interface CalloutProps {
  // Info by default, which asks for something; the danger tone is Error, which says what went wrong with a red title.
  tone?: 'danger';
  title: string;
  description?: string;
  // Mono text in a block of its own, such as an Agent's stderr.
  detail?: string;
  // A spinner before the title while the callout's work runs.
  busy?: boolean;
  // Never more than two controls: top right on a wide window, full width under the text on a phone.
  actions?: ReactNode;
  testID?: string;
}
