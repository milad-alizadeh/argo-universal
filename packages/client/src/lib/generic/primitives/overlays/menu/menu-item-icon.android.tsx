import { RNHostView } from '@expo/ui';
import { DropdownMenuItem } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import type { IconName } from '../../../symbols/icon-names';

interface LeadingProps {
  icon?: IconName;
  tone?: 'danger';
  disabled?: boolean;
}

export function ItemLeadingIcon(props: LeadingProps): React.JSX.Element | null {
  if (!props.icon) return null;

  return (
    <DropdownMenuItem.LeadingIcon>
      <NativeIcon {...props} icon={props.icon} />
    </DropdownMenuItem.LeadingIcon>
  );
}

function NativeIcon(
  props: LeadingProps & { icon: IconName },
): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <View className={props.disabled ? 'opacity-38' : undefined}>
        <Icon
          name={props.icon}
          role="grouped-row"
          tone={props.tone ?? 'muted'}
        />
      </View>
    </RNHostView>
  );
}
