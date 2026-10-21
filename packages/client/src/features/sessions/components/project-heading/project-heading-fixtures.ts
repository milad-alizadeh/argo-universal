import type { ProjectHeadingProps } from './project-heading';

// A story supplies the callbacks; a fixture is the Project and whether its group is closed.
type ProjectHeadingFixture = Omit<
  ProjectHeadingProps,
  'onToggle' | 'onAdd' | 'onProjectSettings'
>;

export const expandedProject = {
  name: 'Example Project',
  collapsed: false,
} satisfies ProjectHeadingFixture;

export const collapsedProject = {
  ...expandedProject,
  collapsed: true,
} satisfies ProjectHeadingFixture;
