import { RNHostView } from '@expo/ui';
import { IconButton } from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { ActionProps } from '#primitives/actions/action-list';
import { Icon } from '#primitives/content/icon';
import { Host } from '#primitives/native/host';

// Universal Button has no stock icon-only variant; Compose owns this control's shape and touch target.
export function PageActionButton({
  action,
}: {
  action: ActionProps;
}): ReactElement {
  const { colors } = useNativeTheme();

  const props = actionButtonProps(action, colors.foreground);

  return (
    <Host matchContents>
      <IconButton {...props}>
        <ActionIcon action={action} />
      </IconButton>
    </Host>
  );
}

function ActionIcon({ action }: { action: ActionProps }): ReactElement {
  return (
    <RNHostView>
      <Icon name={action.icon} role="action" />
    </RNHostView>
  );
}

function actionButtonProps(
  action: ActionProps,
  foreground: string | undefined,
): Omit<React.ComponentProps<typeof IconButton>, 'children'> {
  return {
    onClick: action.onPress,
    enabled: !action.disabled,
    colors: { contentColor: foreground },
    modifiers: [semantics({ contentDescription: action.label })],
  };
}
