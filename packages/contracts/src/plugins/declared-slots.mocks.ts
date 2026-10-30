import { sessionHeaderSlotId, sessionWorkbenchSlotId } from './declared-slots';
import { PluginManifest } from './plugins';

// A Session header action as an author writes it, before Argo checks it.
export const openIssue = {
  id: 'open-issue',
  label: 'Open Issue',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  placement: 'header',
  target: { type: 'page', path: '/issues' },
};

// A Workbench card with a page and a full view.
export const issueCard = {
  id: 'issue',
  title: 'Issue',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  page: '/issues/session',
  tab: '/issues/session/full',
};

// A manifest's `contributes.declared` as an author writes it.
type AuthoredDeclared = Readonly<Record<string, readonly object[]>>;

export const manifestDeclaring = (
  declared: AuthoredHeaderActions | AuthoredWorkbenchCards | AuthoredDeclared,
): ReturnType<typeof PluginManifest.safeParse> =>
  PluginManifest.safeParse({
    id: 'tracker',
    name: 'Tracker',
    version: '1.0.0',
    engines: { argo: '>=0.0.0' },
    main: 'index.js',
    icon: { material: 'extension' },
    contributes: { nav: [], declared },
  });

// One Slot's authored items, keyed by the Slot a manifest declares them under.
interface AuthoredHeaderActions {
  [sessionHeaderSlotId]: readonly object[];
}

interface AuthoredWorkbenchCards {
  [sessionWorkbenchSlotId]: readonly object[];
}

export const headerActions = (
  actions: readonly object[],
): AuthoredHeaderActions => ({ [sessionHeaderSlotId]: actions });

export const workbenchCards = (
  cards: readonly object[],
): AuthoredWorkbenchCards => ({ [sessionWorkbenchSlotId]: cards });
