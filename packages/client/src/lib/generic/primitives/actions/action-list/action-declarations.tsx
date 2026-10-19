import { isValidElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ActionProps, ActionSectionProps } from './action-list-props';

export function Action(_props: ActionProps): null {
  return null;
}

export function ActionSection(_props: ActionSectionProps): null {
  return null;
}

export type DeclaredAction = ActionProps & { id: string };

export interface ActionGroup {
  boundary?: boolean;
  title?: string;
  actions: DeclaredAction[];
}

function childGroups(child: ReactNode): ActionGroup[] {
  if (isValidElement<ActionProps>(child) && child.type === Action)
    return [
      {
        actions: [
          { ...child.props, id: encodeURIComponent(String(child.key)) },
        ],
      },
    ];

  return nestedGroups(child);
}

function nestedGroups(child: ReactNode): ActionGroup[] {
  if (!isValidElement<ActionSectionProps>(child)) return [];

  return sectionGroups(child);
}

function sectionGroups(
  child: React.ReactElement<ActionSectionProps>,
): ActionGroup[] {
  if (child.type !== ActionSection) return [];

  return [
    {
      boundary: true,
      title: child.props.title,
      actions: prefixedActions(child.props.children, String(child.key)),
    },
  ];
}

export function actionGroups(children: ReactNode): ActionGroup[] {
  return mergeLooseGroups(flattenedChildren(children).flatMap(childGroups));
}

export function orderedGroups(groups: ActionGroup[]): ActionGroup[] {
  const normal = groups.flatMap(normalGroup);

  const danger = groups.flatMap((group) =>
    group.actions.filter((action) => action.tone === 'danger'),
  );

  return danger.length ? [...normal, { actions: danger }] : normal;
}

function normalGroup(group: ActionGroup): ActionGroup[] {
  const actions = group.actions.filter((action) => action.tone !== 'danger');

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

function prefixedActions(
  children: ReactNode,
  prefix: string,
): DeclaredAction[] {
  return actionGroups(children).flatMap((group) =>
    group.actions.map((action) => ({
      ...action,
      id: `${encodeURIComponent(prefix)}/${action.id}`,
    })),
  );
}

function mergeable(
  previous: ActionGroup | undefined,
  group: ActionGroup,
): boolean {
  if (!previous) return false;

  return !previous.boundary && !group.boundary;
}
