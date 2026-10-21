import type { AlertProps } from './alert-props';

type AlertFixture = Omit<AlertProps, 'onOpenChange'>;

const removeTitle = 'Delete item?';

const removeMessage = 'This cannot be undone.';

const removeAgent = 'Delete';

export const destructiveConfirmationAlert = {
  open: false,
  title: removeTitle,
  message: removeMessage,
  actions: [
    { label: removeAgent, tone: 'danger' },
    { label: 'Cancel', role: 'cancel' },
  ],
} satisfies AlertFixture;

export const questionAlert = {
  open: false,
  title: 'Discard your changes?',
  message: 'Saved settings stay as they are.',
  actions: [{ label: 'Keep editing', role: 'cancel' }, { label: 'Discard' }],
} satisfies AlertFixture;

export const disabledAnswerAlert = {
  open: false,
  title: 'Update item?',
  message: 'Stop running work before updating.',
  actions: [
    { label: 'Cancel', role: 'cancel' },
    { label: 'Update', disabled: true },
  ],
} satisfies AlertFixture;

export const runningAnswerAlert = {
  open: false,
  title: removeTitle,
  message: removeMessage,
  actions: [
    { label: removeAgent, tone: 'danger', loading: true },
    { label: 'Cancel', role: 'cancel' },
  ],
} satisfies AlertFixture;
