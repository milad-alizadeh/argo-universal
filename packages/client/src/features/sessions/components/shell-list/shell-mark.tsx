import type { Shell } from '@repo/contracts';
import type { JSX } from 'react';
import { Icon } from '#primitives/content/icon';
import { StatusDot } from '#primitives/status/status-dot';
import { shellOutcome } from './shell-format';

// A running Shell's row leads with a live dot; an ended one with the icon for how it ended.
export function ShellMark({ shell }: { shell: Shell }): JSX.Element {
  const outcome = shellOutcome(shell);

  if (!outcome.icon)
    return <StatusDot tone={outcome.tone} accessibilityLabel={outcome.label} />;

  return <Icon name={outcome.icon} role="body" tone={outcome.tone} />;
}
