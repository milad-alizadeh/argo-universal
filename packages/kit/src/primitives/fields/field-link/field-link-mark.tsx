import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { TintedAvatar } from '../../../tinted-avatar';
import type { FieldGroupKitProps } from '../../kit-props';

type Mark = NonNullable<FieldGroupKitProps<'FieldGroup.Link'>['leadingMark']>;

export function FieldLinkMark({ mark }: { mark: Mark }): ReactElement {
  if (mark.plain)
    return (
      <View className="size-9 items-center justify-center">
        <Icon name={mark.icon} tone={mark.tone} />
      </View>
    );

  return <Avatar mark={mark} />;
}

function Avatar({ mark }: { mark: Mark }): ReactElement {
  return (
    <TintedAvatar
      icon={mark.icon}
      tone={mark.tone === 'danger' ? 'neutral' : mark.tone}
      dimmed={mark.dimmed}
      accessibilityLabel={mark.label}
      status={
        mark.status
          ? { tone: mark.status.tone, accessibilityLabel: mark.status.label }
          : undefined
      }
    />
  );
}
