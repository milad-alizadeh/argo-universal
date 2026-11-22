import type { Shell } from '@repo/contracts';
import { leadingMarkClass } from '@repo/kit/leading-mark';
import { Icon } from '@repo/kit/primitives/content/icon';
import type { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import type { ComponentProps, JSX } from 'react';
import { View } from 'react-native';
import { shellOutcome, type ShellOutcome } from './shell-format';

type Mark = NonNullable<ComponentProps<typeof FieldGroup.Link>['leadingMark']>;

const runningMark = {
  icon: 'terminal',
  tone: 'neutral',
  label: 'Background Task',
  status: { tone: 'success', label: 'Running' },
} as const satisfies Mark;

export function shellRowMark(shell: Shell): Mark {
  if (shell.status === 'running') return runningMark;

  const { icon = 'terminal', tone, label } = shellOutcome(shell);

  return {
    icon,
    tone: tone === 'danger' || tone === 'warning' ? tone : 'neutral',
    label,
    plain: true,
  };
}

// Running work badges its terminal mark; completed work keeps its outcome.
export function ShellMark({ shell }: { shell: Shell }): JSX.Element {
  if (shell.status === 'running')
    return (
      <TintedAvatar
        accessibilityLabel={runningMark.label}
        icon={runningMark.icon}
        tone={runningMark.tone}
        status={{
          tone: runningMark.status.tone,
          accessibilityLabel: runningMark.status.label,
        }}
      />
    );

  return <EndedShellMark outcome={shellOutcome(shell)} />;
}

function EndedShellMark({ outcome }: { outcome: ShellOutcome }): JSX.Element {
  return (
    <View
      className={`${leadingMarkClass} shrink-0 items-center justify-center`}
    >
      <Icon name={outcome.icon ?? 'terminal'} tone={outcome.tone} />
    </View>
  );
}
