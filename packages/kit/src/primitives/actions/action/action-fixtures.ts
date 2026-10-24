import type { PressActionProps } from './action-props';

export interface DemoAction extends Omit<PressActionProps, 'onPress'> {
  result: string;
}

interface RowFixture {
  title: string;
  actions: DemoAction[];
}

export const contextMenuActions = {
  title: 'Item',
  actions: [
    {
      label: 'Rename',
      icon: 'rename',
      shortcut: { modifiers: [], key: 'Enter' },
      result: 'Ready to rename',
    },
    {
      label: 'Copy link',
      icon: 'copy',
      shortcut: { modifiers: ['meta', 'shift'], key: 'c' },
      result: 'Link copied',
    },
    {
      label: 'Archive',
      icon: 'archive',
      shortcut: { modifiers: ['meta'], key: 'Backspace' },
      result: 'Archived',
    },
  ],
} satisfies RowFixture;

export const destructiveActions = {
  title: 'Another item',
  actions: [
    { label: 'Assign', icon: 'agent', result: 'Assigned to you' },
    { label: 'Change status', icon: 'check', disabled: true, result: '' },
    { label: 'Delete', icon: 'delete', tone: 'danger', result: 'Deleted' },
  ],
} satisfies RowFixture;

export const pageActions = [
  { label: 'Add', icon: 'add', result: 'Added' },
  { label: 'Create', icon: 'branch', result: 'Created' },
  { label: 'Show archived', icon: 'archive', result: 'Showing archived' },
] satisfies DemoAction[];
