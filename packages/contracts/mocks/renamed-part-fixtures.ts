import type { WireNode } from '../src/plugins/wire';

export const previousDraftFixtures: {
  type: string;
  props: WireNode['props'];
  legacy: WireNode['props'];
}[] = [
  {
    type: 'Switch',
    props: {
      value: true,
      onValueChange: { $event: 'onValueChange' },
      accessibilityLabel: 'Enabled',
    },
    legacy: {
      checked: true,
      label: 'Enabled',
    },
  },
  {
    type: 'Checkbox',
    props: {
      value: false,
      onValueChange: { $event: 'onValueChange' },
      label: 'Remember',
    },
    legacy: {
      checked: false,
      label: 'Remember',
    },
  },
  {
    type: 'Slider',
    props: {
      value: 2,
      minimumValue: 1,
      maximumValue: 10,
      step: 1,
      accessibilityLabel: 'Effort',
      valueLabel: 'Low',
      onValueChange: { $event: 'onValueChange' },
    },
    legacy: {
      value: 2,
      min: 1,
      max: 10,
      step: 1,
      label: 'Effort',
    },
  },
  {
    type: 'SearchField',
    props: {
      label: 'Search jobs',
      value: 'build',
      onChangeText: { $event: 'onChangeText' },
    },
    legacy: {
      placeholder: 'Search jobs',
      value: 'build',
    },
  },
  {
    type: 'Picker',
    props: {
      label: 'Mode',
      value: 'fast',
      options: [{ value: 'fast', label: 'Fast' }],
      variant: 'row',
      onValueChange: { $event: 'onValueChange' },
    },
    legacy: {
      label: 'Mode',
      value: 'fast',
      options: [{ value: 'fast', label: 'Fast' }],
      variant: 'menu',
    },
  },
  {
    type: 'Picker',
    props: {
      label: 'Labels',
      multiple: true,
      value: ['bug', 'docs'],
      options: [
        { value: 'bug', label: 'Bug' },
        { value: 'docs', label: 'Docs' },
      ],
      onValueChange: { $event: 'onValueChange' },
    },
    legacy: {
      label: 'Labels',
      multiple: true,
      value: ['bug', 'docs'],
      options: [
        { value: 'bug', label: 'Bug' },
        { value: 'docs', label: 'Docs' },
      ],
      variant: 'menu',
    },
  },
  {
    type: 'DatePicker',
    props: {
      label: 'Due date',
      value: '2026-10-19T14:30',
      mode: 'datetime',
      required: true,
      disabled: true,
      onValueChange: { $event: 'onValueChange' },
    },
    legacy: { label: 'Due date', value: '2026-10-19T14:30', mode: 'datetime' },
  },
  { type: 'Tooltip', props: { label: 'Save' }, legacy: { text: 'Save' } },
  {
    type: 'Toast',
    props: { title: 'Saved', message: 'All changes saved', tone: 'success' },
    legacy: {
      title: 'Saved',
      description: 'All changes saved',
      tone: 'success',
    },
  },
  {
    type: 'Sheet',
    props: {
      open: true,
      onOpenChange: { $event: 'onOpenChange' },
      label: 'Settings',
    },
    legacy: { title: 'Settings' },
  },
];

export const previousAppFixtures: typeof previousDraftFixtures = [
  {
    type: 'Button',
    props: { label: 'Save', loading: true, icon: 'check', fullWidth: true },
    legacy: { label: 'Save', disabled: true },
  },
];
