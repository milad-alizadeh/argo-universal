import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { TintedAvatar } from '../../../tinted-avatar';
import type { FieldGroupKitProps } from '../../kit-props';

type Mark = NonNullable<FieldGroupKitProps<'FieldGroup.Link'>['leadingMark']>;

const hueInk = {
  teal: 'text-tone-teal-700',
  pink: 'text-tone-pink-700',
} as const;

// Icon's tones name meanings only, so a plain mark in a hue takes the avatar's ink for it (ADR-0026, #2122).
const plainColour = (
  tone: Mark['tone'],
): Pick<ComponentProps<typeof Icon>, 'tone' | 'className'> =>
  tone === 'teal' || tone === 'pink' ? { className: hueInk[tone] } : { tone };

export function FieldLinkMark({ mark }: { mark: Mark }): ReactElement {
  if (mark.plain)
    return (
      <View className="size-9 items-center justify-center">
        <Icon name={mark.icon} {...plainColour(mark.tone)} />
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
