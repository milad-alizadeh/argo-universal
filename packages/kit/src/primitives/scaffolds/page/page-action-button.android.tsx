import { IconButton } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import type { IconSymbol } from '#kit/symbols/icon-symbol';
import type {
  IconAction,
  PressActionProps,
} from '#primitives/actions/action-list';
import { Icon } from '#primitives/content/icon';
import { ButtonIcon } from '#primitives/native/button-icon';
import { Host } from '#primitives/native/host';

// What a header icon button draws and runs; a menu's opens its menu, and the overflow's icon is a symbol pair.
export type HeaderIconButtonProps = Pick<
  PressActionProps,
  'label' | 'disabled' | 'onPress'
> & { icon: IconSymbol };

// Universal Button has no stock icon-only variant; Compose owns this control's shape and touch target.
export function PageActionButton({
  action,
}: {
  action: IconAction;
}): ReactElement {
  return (
    <Host matchContents>
      <HeaderIconButton {...action} />
    </Host>
  );
}

// The Compose IconButton alone, for a Host or a DropdownMenu trigger that already holds it; its icon takes the button's content colour.
export function HeaderIconButton(props: HeaderIconButtonProps): ReactElement {
  const { colors } = useNativeTheme();

  return (
    <IconButton {...actionButtonProps(props, colors.foreground)}>
      <ButtonIcon
        name={props.icon}
        onPress={props.onPress}
        disabled={props.disabled}
      >
        <Icon name={props.icon} size="md" />
      </ButtonIcon>
    </IconButton>
  );
}

function actionButtonProps(
  action: HeaderIconButtonProps,
  foreground: string | undefined,
): Omit<React.ComponentProps<typeof IconButton>, 'children'> {
  return {
    onClick: action.onPress,
    enabled: !action.disabled,
    colors: { contentColor: foreground },
    modifiers: [semantics({ contentDescription: action.label })],
  };
}
