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
  subtitleId?: string;
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
function LabelText(props: LabelProps): React.JSX.Element {
  const { label, subtitle, subtitleId, subtitleTone } = props;

  if (!subtitle) return <Text className="flex-1">{label}</Text>;

  const tone = subtitleTone ?? 'muted';

  return (
    <View className="flex-1">
      <Text>{label}</Text>
      <Text nativeID={subtitleId} role="secondary" tone={tone}>
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
