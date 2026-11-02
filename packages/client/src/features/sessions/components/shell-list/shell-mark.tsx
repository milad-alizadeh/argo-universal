import type { Shell } from '@repo/contracts';
import { Icon } from '@repo/kit/primitives/content/icon';
import { TintedAvatar } from '@repo/kit/tinted-avatar';
import type { JSX } from 'react';
import { View } from 'react-native';
import { shellOutcome, type ShellOutcome } from './shell-format';

// Running work badges its terminal mark; completed work keeps its outcome.
export function ShellMark({ shell }: { shell: Shell }): JSX.Element {
  if (shell.status === 'running')
    return (
      <TintedAvatar
        icon="terminal"
        tone="neutral"
        status={{ tone: 'success', accessibilityLabel: 'Running' }}
      />
    );

  return <EndedShellMark outcome={shellOutcome(shell)} />;
}

function EndedShellMark({ outcome }: { outcome: ShellOutcome }): JSX.Element {
  return (
    <View className="size-9 shrink-0 items-center justify-center wide-type:size-7">
      <Icon name={outcome.icon ?? 'terminal'} tone={outcome.tone} />
    </View>
  );
}
