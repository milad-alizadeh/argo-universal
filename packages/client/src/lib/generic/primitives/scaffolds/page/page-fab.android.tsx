import { RNHostView } from '@expo/ui';
import { FloatingActionButton } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import { Icon } from '#primitives/content/icon';
import { Host } from '#primitives/native/host';
import type { PageProps } from './page-props';

type FabProps = { action: NonNullable<PageProps['primaryAction']> };

export function PageFab({ action }: FabProps): ReactElement {
  return (
    <View
      className="absolute z-20 right-4 bottom-safe-offset-4"
      pointerEvents={action.disabled ? 'none' : 'auto'}
      accessibilityState={{ disabled: action.disabled }}
    >
      <Host matchContents>
        <FabButton action={action} />
      </Host>
    </View>
  );
}

function FabButton({ action }: FabProps): ReactElement {
  const { colors } = useNativeTheme();

  const props = {
    onClick: action.disabled ? undefined : action.onPress,
    containerColor: colors.primary,
    modifiers: [semantics({ contentDescription: action.label })],
  };

  return (
    <FloatingActionButton {...props}>
      <FloatingActionButton.Icon>
        <FabIcon action={action} />
      </FloatingActionButton.Icon>
    </FloatingActionButton>
  );
}

function FabIcon({ action }: FabProps): ReactElement {
  return (
    <RNHostView matchContents>
      <Icon
        name={action.icon}
        role="action"
        className="text-primary-foreground"
      />
    </RNHostView>
  );
}
