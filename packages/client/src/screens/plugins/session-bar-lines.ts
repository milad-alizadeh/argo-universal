import type { SessionBarItem } from '@repo/contracts/plugins/wire';
import type { SessionBarEntry, SessionBarProps } from '#features/sessions';
import type { Merged, SlotVisibility } from '#features/settings';
import { pluginSymbol } from './plugin-symbol';

type SessionBarLines = Pick<SessionBarProps, 'shown' | 'hidden'>;

type Attributed = Merged<SessionBarItem>['items'][number];

const entryOf =
  (pluginName: (pluginId: string) => string) =>
  ({ pluginId, item }: Attributed): SessionBarEntry => ({
    pluginId,
    pluginName: pluginName(pluginId),
    ...(item.icon && { icon: pluginSymbol(item.icon) }),
    text: item.text,
    ...(item.action && { path: item.action.path }),
  });

/*
 * A Session's bar under this Device's choices: the first Plugin left on, in Slot order, and the rest for "+N", each
 * named for the reader; hiding a Plugin gives the line to the next. No bar while no Plugin left on answers.
 */
export function sessionBarLines(
  answer: Merged<SessionBarItem>,
  visibility: SlotVisibility,
  pluginName: (pluginId: string) => string,
): SessionBarLines | undefined {
  const entry = entryOf(pluginName);

  const [shown, ...rest] = [...answer.items, ...answer.overflow].flatMap(
    (line) => (visibility.shows(line.pluginId) ? [entry(line)] : []),
  );

  return shown && { shown, hidden: rest };
}
