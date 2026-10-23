import type { FieldDatePickerProps } from './field-date-picker-props';

type FieldDatePickerFixture = Omit<FieldDatePickerProps, 'onValueChange'>;

export const dateOnly = {
  title: 'Due date',
  value: '2026-10-19',
} satisfies FieldDatePickerFixture;

export const timeOnly = {
  title: 'Reminder',
  mode: 'time',
  value: '14:30',
} satisfies FieldDatePickerFixture;

export const dateAndTime = {
  title: 'Due',
  mode: 'datetime',
  value: '2026-10-19T14:30',
} satisfies FieldDatePickerFixture;

export const unset = {
  title: 'Due date',
  value: undefined,
} satisfies FieldDatePickerFixture;

export const disabledDate = {
  title: 'Due date',
  value: '2026-10-19',
  disabled: true,
} satisfies FieldDatePickerFixture;
