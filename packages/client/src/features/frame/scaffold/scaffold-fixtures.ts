import type { ScaffoldMockProps } from './scaffold.mocks';

// A story supplies the callbacks and any JSX panes; a fixture is the window the Scaffold lays out.
type ScaffoldFixture = Omit<
  ScaffoldMockProps,
  | 'onSectionChange'
  | 'onSidebarShownChange'
  | 'onInspectorStateChange'
  | 'inspector'
  | 'band'
  | 'children'
>;

// A wide window: the rail, the sidebar's list and the page, with the Inspector closed.
export const wideScaffold = {
  sizeClass: 'wide',
  selectedSection: 'sessions',
  attentionCount: 1,
  sidebarShown: true,
  inspectorState: 'closed',
} satisfies ScaffoldFixture;

// Paper's "Rail B · collapsed": only the rail stays on the glass, beside the page and its Inspector.
export const collapsedSidebarScaffold = {
  ...wideScaffold,
  sidebarShown: false,
  inspectorState: 'open',
} satisfies ScaffoldFixture;

export const openInspectorScaffold = {
  ...wideScaffold,
  inspectorState: 'open',
} satisfies ScaffoldFixture;

// A medium window takes the phone shell (ADR-0026): the page fills the window.
export const mediumScaffold = {
  ...wideScaffold,
  sizeClass: 'medium',
} satisfies ScaffoldFixture;
