import type { ShellTerminal } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

export interface ShellTerminalInspectorProps {
  shell: ShellTerminal;
  onClose: () => void;
  children?: ReactNode;
}

export function ShellTerminalInspector({
  shell,
  onClose,
  children,
}: ShellTerminalInspectorProps): ReactElement {
  return (
    <View className="min-h-0 flex-1 gap-2">
      <View className="min-w-0 flex-row items-center gap-2">
        <Icon name="terminal" tone="muted" />
        <View className="min-w-0 flex-1">
          <Text role="secondary-code" numberOfLines={1}>
            {shell.cwd}
          </Text>
        </View>
        <Button label="Close" size="sm" variant="text" onPress={onClose} />
      </View>
      {children}
    </View>
  );
}
