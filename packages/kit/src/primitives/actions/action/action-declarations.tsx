import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type {
  ActionProps,
  ActionSectionProps,
  DeclaredPressProps,
  SubmenuActionProps,
} from './action-props';
import {
  isDanger,
  isPress,
  type ActionGroup,
  type DeclaredAction,
  type DeclaredEntry,
  type DeclaredSubmenu,
} from './declared-entry';
import { withId } from './entry-ids';

export function ActionSection(_props: ActionSectionProps): null {
  return null;
}

function ActionRoot(_props: ActionProps & { plugin?: boolean }): null {
  return null;
}

// Declares one verb; its Sections group Actions, as `Action.Section`.
export const Action = Object.assign(ActionRoot, { Section: ActionSection });

export {
  isDanger,
  isPress,
  isSubmenu,
  pressActions,
  type ActionGroup,
  type DeclaredAction,
  type DeclaredEntry,
  type DeclaredSection,
  type DeclaredSubmenu,
} from './declared-entry';

// A submenu's Sections as groups, danger Actions last, as a header's overflow menu orders its own.
export function submenuGroups(
  submenu: DeclaredSubmenu,
): ActionGroup<DeclaredAction>[] {
  return orderedGroups(
    submenu.sections.map((section) => ({ boundary: true, ...section })),
  );
}

function childGroups(child: ReactNode): ActionGroup[] {
  if (isValidElement<ActionProps>(child) && child.type === Action)
    return actionGroup(child);

  return nestedGroups(child);
}

// A press Action is one entry; an Action without `onPress` opens a submenu of its keyed Section children, and one with no Actions to open drops out.
function actionGroup(child: ReactElement<ActionProps>): ActionGroup[] {
  const id = encodeURIComponent(String(child.key));

  if (isPressProps(child.props)) return [{ actions: [{ ...child.props, id }] }];
  const submenu = declaredSubmenu(child.props, id);

  return submenu.sections.length ? [{ actions: [submenu] }] : [];
}

const isPressProps = (props: ActionProps): props is DeclaredPressProps =>
  'onPress' in props && props.onPress !== undefined;

function declaredSubmenu(
  { children, ...props }: SubmenuActionProps,
  id: string,
): DeclaredSubmenu {
  const groups = pressGroups(prefixedGroups(actionGroups(children), id));

  return {
    ...props,
    id,
    sections: groups.map(({ title, actions }) => ({ title, actions })),
  };
}

function nestedGroups(child: ReactNode): ActionGroup[] {
  if (!isValidElement<ActionSectionProps>(child)) return [];

  return sectionGroups(child);
}

const elementName = (child: ReactElement): string =>
  typeof child.type === 'string' ? child.type : child.type.name || 'Component';

// Only Action and Action.Section elements declare Actions; any other element is left out, so in development it says so.
function unexpectedElement(child: ReactElement): ActionGroup[] {
  if (process.env.NODE_ENV !== 'production')
    console.error(
      `Actions: <${elementName(child)}> is not an Action or Action.Section, so it declares no Actions. Pass Action elements, not a component that renders them.`,
    );

  return [];
}

function sectionGroups(child: ReactElement<ActionSectionProps>): ActionGroup[] {
  if (child.type !== ActionSection) return unexpectedElement(child);

  const groups = prefixedGroups(
    actionGroups(child.props.children),
    encodeURIComponent(String(child.key)),
  );

  return [
    {
      boundary: true,
      title: child.props.title,
      actions: groups.flatMap((group) => group.actions),
    },
  ];
}

export function actionGroups(children: ReactNode): ActionGroup[] {
  return mergeLooseGroups(flattenedChildren(children).flatMap(childGroups));
}

// A part's keyed press Action children in order, as an Alert's answers or a SplitButton's menu.
export function declaredActions(children: ReactNode): DeclaredAction[] {
  return actionGroups(children)
    .flatMap((group) => group.actions)
    .filter(isPress);
}

export function orderedGroups<Entry extends DeclaredEntry>(
  groups: ActionGroup<Entry>[],
): ActionGroup<Entry>[] {
  const normal = groups.flatMap(normalGroup);

  const danger = groups.flatMap((group) => group.actions.filter(isDanger));

  return danger.length ? [...normal, { actions: danger }] : normal;
}

function normalGroup<Entry extends DeclaredEntry>(
  group: ActionGroup<Entry>,
): ActionGroup<Entry>[] {
  const actions = group.actions.filter((action) => !isDanger(action));

  return actions.length ? [{ ...group, actions }] : [];
}

function mergeLooseGroups(groups: ActionGroup[]): ActionGroup[] {
  const result: ActionGroup[] = [];

  for (const group of groups) appendGroup(result, group);

  return result;
}

function appendGroup(result: ActionGroup[], group: ActionGroup): void {
  const previous = result.at(-1);

  if (mergeable(previous, group)) previous?.actions.push(...group.actions);
  else result.push(group);
}

function mergeable(
  previous: ActionGroup | undefined,
  group: ActionGroup,
): boolean {
  if (!previous) return false;

  return !previous.boundary && !group.boundary;
}

// Every entry's id under `prefix`, so entries from two places never share one.
export function prefixedGroups(
  groups: ActionGroup[],
  prefix: string,
): ActionGroup[] {
  return groups.map((group) => ({
    ...group,
    actions: group.actions.map((entry) =>
      withId(entry, `${prefix}/${entry.id}`),
    ),
  }));
}

// The press Actions, each group keeping its title; a group left empty drops out.
export function pressGroups(
  groups: ActionGroup[],
): ActionGroup<DeclaredAction>[] {
  return groups.flatMap((group) => {
    const actions = group.actions.filter(isPress);

    return actions.length ? [{ ...group, actions }] : [];
  });
}
