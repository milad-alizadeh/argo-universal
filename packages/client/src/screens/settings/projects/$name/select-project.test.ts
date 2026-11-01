import { expect, it } from 'vitest';
import { selectProject } from './select-project';

const projects = [
  { id: 'p-1', name: 'argo' },
  { id: 'p-2', name: 'argo' },
];

it('selects by stable id when two Projects share a display name', () => {
  expect(selectProject(projects, 'argo', 'p-2')).toBe(projects[1]);
});

it('finds no Project when the id is not here, even if the name is', () => {
  expect(selectProject(projects, 'argo', 'gone')).toBeUndefined();
});

it('selects by name when no id is given', () => {
  expect(selectProject(projects, 'argo')).toBe(projects[0]);
});
