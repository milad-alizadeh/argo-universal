import type { PermissionOutcomeProps } from './permission-outcome';

// A story draws the component as it is; a fixture is the outcome the user chose.
type PermissionOutcomeFixture = PermissionOutcomeProps;

// The user denied the request once.
export const deniedOutcome = {
  outcome: {
    outcome: 'selected',
    optionId: 'reject_once',
    name: 'Deny',
    kind: 'reject_once',
  },
} satisfies PermissionOutcomeFixture;

// An ACP Agent named its own allow option and the user chose it.
export const choseAnotherAllowOptionOutcome = {
  outcome: {
    outcome: 'selected',
    optionId: 'allow-always',
    name: 'Always Allow',
    kind: 'allow_always',
  },
} satisfies PermissionOutcomeFixture;

// An ACP Agent named its own reject option and the user chose it.
export const choseAnotherRejectOptionOutcome = {
  outcome: {
    outcome: 'selected',
    optionId: 'reject-always',
    name: 'Never allow',
    kind: 'reject_always',
  },
} satisfies PermissionOutcomeFixture;
