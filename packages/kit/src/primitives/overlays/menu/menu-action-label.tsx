import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import {
  Kbd,
  shortcutKeys,
  type ActionShortcut,
} from '#primitives/content/kbd';
import { Text } from '#primitives/content/text';
import type { IconSymbol } from '../../../symbols/icon-symbol';

interface LabelProps {
  label: string;
  icon?: IconSymbol;
  content?: ReactNode;
  shortcut?: ActionShortcut;
  subtitle?: string;
  subtitleTone?: 'warning';
}

export function MenuActionLabel(props: LabelProps): React.JSX.Element {
  return (
    <>
      <LeadingIcon icon={props.icon} />
      {props.content ?? <LabelText {...props} />}
      <ShortcutHint shortcut={props.shortcut} />
    </>
  );
}

// The label, with its subtitle under it in the muted tone, or the warning tone when it says something stopped.
function LabelText({
  label,
  subtitle,
  subtitleTone = 'muted',
}: Pick<LabelProps, 'label' | 'subtitle' | 'subtitleTone'>): React.JSX.Element {
  if (!subtitle) return <Text className="flex-1">{label}</Text>;

  return (
    <View className="flex-1">
      <Text>{label}</Text>
      <Text role="secondary" tone={subtitleTone}>
        {subtitle}
      </Text>
    </View>
  );
}

function LeadingIcon({
  icon,
}: Pick<LabelProps, 'icon'>): React.JSX.Element | null {
  return icon ? <Icon name={icon} size="md" /> : null;
}

function ShortcutHint({
  shortcut,
}: Pick<LabelProps, 'shortcut'>): React.JSX.Element | null {
  return shortcut ? <Kbd keys={shortcutKeys(shortcut)} /> : null;
}
