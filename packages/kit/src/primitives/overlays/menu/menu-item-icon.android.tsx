import { DropdownMenuItem } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { ButtonIcon } from '#primitives/native/button-icon';
import type { IconName } from '../../../symbols/icon-names';

interface LeadingProps {
  icon?: IconName;
  tone?: 'danger';
  disabled?: boolean;
  // The row's press, which an icon hosted from React Native runs itself.
  onPress: () => void;
}

// The row's leading icon takes the item's leading icon colours; one without a Material drawing keeps Argo's tones.
export function ItemLeadingIcon(props: LeadingProps): React.JSX.Element | null {
  if (!props.icon) return null;

  return (
    <DropdownMenuItem.LeadingIcon>
      <ButtonIcon
        name={props.icon}
        onPress={props.onPress}
        disabled={props.disabled}
      >
        <HostedIcon {...props} icon={props.icon} />
      </ButtonIcon>
    </DropdownMenuItem.LeadingIcon>
  );
}

function HostedIcon(
  props: LeadingProps & { icon: IconName },
): React.JSX.Element {
  return (
    <View className={props.disabled ? 'opacity-38' : undefined}>
      <Icon name={props.icon} role="grouped-row" tone={props.tone ?? 'muted'} />
    </View>
  );
}
