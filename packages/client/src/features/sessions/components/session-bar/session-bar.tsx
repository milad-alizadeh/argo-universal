import type { SystemSymbolSource } from '@repo/contracts/kit-symbols';
import { Button } from '@repo/kit/primitives/actions/button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { Surface } from '@repo/kit/primitives/layout/surface';
import { Menu, type MenuAction } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { View } from 'react-native';

// One Plugin's line on the Session bar, with the name "+N" lists it under.
export interface SessionBarEntry {
  pluginId: string;
  pluginName: string;
  icon?: SystemSymbolSource;
  text: string;
  // The Plugin page the line opens, when it has one.
  path?: string;
}

export interface SessionBarProps {
  // The first Plugin's line in Slot order.
  shown: SessionBarEntry;
  // The other Plugins' lines, behind "+N".
  hidden: readonly SessionBarEntry[];
  // Opens a line's Plugin page; a line without one never calls it.
  onOpen: (entry: SessionBarEntry) => void;
}

/*
 * One full-width strip under the Session header: one Plugin's summary, such as "#412 · In review", "+N" for the
 * others, and Open for the shown line's page (ADR-0035). Argo draws it; a Plugin only sends the icon, text and page.
 */
export function SessionBar(props: SessionBarProps): React.JSX.Element {
  return (
    <Surface kind="muted" padding={2}>
      <View className="flex-row items-center gap-2">
        <LineContent entry={props.shown} />
        <HiddenLines hidden={props.hidden} onOpen={props.onOpen} />
        <OpenButton entry={props.shown} onOpen={props.onOpen} />
      </View>
    </Surface>
  );
}

type LineProps = Pick<SessionBarProps, 'onOpen'> & { entry: SessionBarEntry };

function LineContent({ entry }: { entry: SessionBarEntry }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-2">
      {entry.icon && <Icon name={entry.icon} tone="muted" />}
      <Text role="secondary" numberOfLines={1}>
        {entry.text}
      </Text>
    </View>
  );
}

// Only a line with a page has Open; its spoken name says whose page it opens.
function OpenButton({ entry, onOpen }: LineProps): React.ReactNode {
  if (entry.path === undefined) return null;

  return (
    <Button
      label="Open"
      accessibilityLabel={openLabel(entry)}
      variant="secondary"
      size="sm"
      onPress={() => onOpen(entry)}
    />
  );
}

export const openLabel = (entry: SessionBarEntry): string =>
  `Open ${entry.pluginName}`;

type HiddenProps = Pick<SessionBarProps, 'hidden' | 'onOpen'>;

function HiddenLines({ hidden, onOpen }: HiddenProps): React.ReactNode {
  if (!hidden.length) return null;

  return (
    <Menu
      accessibilityLabel={moreLabel(hidden.length)}
      trigger={`+${hidden.length}`}
      align="end"
      actions={hidden.map((entry) => hiddenAction(entry, onOpen))}
    />
  );
}

// "+2" says nothing to a screen reader; its spoken name says what waits behind it.
const moreLabel = (count: number): string =>
  `${count} more Plugin ${count === 1 ? 'line' : 'lines'}`;

// Each hidden line names its Plugin, so the reader knows where it came from.
const hiddenAction = (
  entry: SessionBarEntry,
  onOpen: SessionBarProps['onOpen'],
): MenuAction => ({
  label: `${entry.pluginName}: ${entry.text}`,
  disabled: entry.path === undefined,
  onPress: () => onOpen(entry),
});
