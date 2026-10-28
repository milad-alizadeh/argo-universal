import type { ReactNode } from 'react';
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
}

export function MenuActionLabel(props: LabelProps): React.JSX.Element {
  return (
    <>
      <LeadingIcon icon={props.icon} />
      {props.content ?? <Text className="flex-1">{props.label}</Text>}
      <ShortcutHint shortcut={props.shortcut} />
    </>
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
