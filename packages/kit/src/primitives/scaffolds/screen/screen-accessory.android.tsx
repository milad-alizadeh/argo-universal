import { FloatingActionButton } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { useWide } from '#kit/use-wide/use-wide';
import type { IconAction } from '#primitives/actions/action';
import { Icon } from '#primitives/content/icon';
import { ButtonIcon } from '#primitives/native/button-icon';
import { Host } from '#primitives/native/host';
import type { ScreenHeaderInput } from './screen-props';

type FabProps = { action: IconAction };

// Android's primary Action is the Material FAB, below a wide window, where the heading draws it as a button.
export function ScreenAccessory(props: ScreenHeaderInput): ReactElement | null {
  const action = useWide() ? undefined : props.headers.native.primary;

  if (!action) return null;

  return (
    <View className="absolute z-20 right-4 bottom-safe-offset-4">
      <Host matchContents>
        <FabButton action={action} />
      </Host>
    </View>
  );
}

function FabButton({ action }: FabProps): ReactElement {
  const { colors } = useNativeTheme();

  const props = {
    onClick: action.onPress,
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

// The FAB's container is Argo's primary, which Material cannot pair with a content colour, so its icon takes primary-foreground.
function FabIcon({ action }: FabProps): ReactElement {
  const tint = useNativeTheme().colors.primaryForeground;

  return (
    <ButtonIcon name={action.icon} onPress={action.onPress} tint={tint}>
      <Icon name={action.icon} size="md" className="text-primary-foreground" />
    </ButtonIcon>
  );
}
