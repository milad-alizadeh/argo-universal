import type { DatePickerProps } from './date-picker-props';

type DatePickerFixture = Omit<DatePickerProps, 'onValueChange'>;

export const defaultDatePicker = {
  label: 'Due date',
  value: '2026-10-19',
} satisfies DatePickerFixture;

export const timeDatePicker = {
  label: 'Reminder',
  mode: 'time',
  value: '14:30',
} satisfies DatePickerFixture;

export const dateAndTimeDatePicker = {
  label: 'Due',
  mode: 'datetime',
  value: '2026-10-19T14:30',
} satisfies DatePickerFixture;

export const emptyDatePicker = {
  label: 'Due date',
  value: undefined,
} satisfies DatePickerFixture;

export const disabledDatePicker = {
  label: 'Due date',
  value: '2026-10-19',
  disabled: true,
} satisfies DatePickerFixture;

export const invalidDatePicker = {
  label: 'Due date',
  value: '2026-10-18',
  errors: [{ message: 'Pick today or a later date.' }],
} satisfies DatePickerFixture;
