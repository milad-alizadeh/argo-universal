import type { SessionBarItem } from '@repo/contracts/plugins/session-bar-item';
import type { SessionBarEntry, SessionBarProps } from '#features/sessions';
import { pluginSymbol } from '../../lib/product/plugin-symbol';
import type { ReadItem, SlotReading } from './slot-items';

type SessionBarLines = Pick<SessionBarProps, 'shown' | 'hidden'>;

const entryOf = ({
  pluginId,
  pluginName,
  item,
}: ReadItem<SessionBarItem>): SessionBarEntry => ({
  pluginId,
  pluginName,
  ...(item.icon && { icon: pluginSymbol(item.icon) }),
  text: item.text,
  ...(item.action && { path: item.action.path }),
});

/*
 * A Session's bar from what the reader read: the first Plugin's line, in Slot order, and the rest for "+N". The
 * reader has already left out the Plugins this Device turned off, so hiding one gives the line to the next. No bar
 * while no Plugin left on answers.
 */
export function sessionBarLines(
  reading: SlotReading<SessionBarItem>,
): SessionBarLines | undefined {
  const [shown, ...hidden] = [...reading.items, ...reading.overflow].map(
    entryOf,
  );

  return shown && { shown, hidden };
}
