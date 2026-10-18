import {
  actionListProps,
  actionProps,
  actionSectionProps,
} from '@repo/contracts/plugins/action-list-props';
import { ActionList, Action } from '#primitives/actions/action-list';
import { entry, handlerOf } from './plugin-rendering';

export const pluginActionEntries = {
  ActionList: entry(actionListProps, (props, context, children) => (
    <ActionList {...props} plugin trigger={context.slots.trigger}>
      {children}
    </ActionList>
  )),
  'ActionList.Section': entry(
    actionSectionProps,
    (props, _context, children) => (
      <ActionList.Section {...props}>{children}</ActionList.Section>
    ),
  ),
  Action: entry(actionProps, ({ onPress, ...props }, context) => (
    <Action {...props} onPress={handlerOf(onPress, context) ?? noAction} />
  )),
};

function noAction(): void {}
