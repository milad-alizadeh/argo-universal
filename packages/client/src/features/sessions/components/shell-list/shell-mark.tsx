import type { Shell } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type { JSX } from 'react';
import { shellOutcome } from './shell-format';

// A running Shell's row leads with a live dot; an ended one with the icon for how it ended.
export function ShellMark({ shell }: { shell: Shell }): JSX.Element {
  const outcome = shellOutcome(shell);

  if (!outcome.icon)
    return <StatusDot tone={outcome.tone} accessibilityLabel={outcome.label} />;

  return <Icon name={outcome.icon} role="body" tone={outcome.tone} />;
}
