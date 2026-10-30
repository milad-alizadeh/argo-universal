import type { TurnEndRowProps } from './turn-end';
import { endings } from './turn-end.mocks';

export const stoppedTurnEnd = {
  end: endings.stopped,
} satisfies TurnEndRowProps;

export const deniedTurnEnd = {
  end: endings.denied,
} satisfies TurnEndRowProps;

export const outputLimitTurnEnd = {
  end: endings.outputLimit,
} satisfies TurnEndRowProps;

export const stepLimitTurnEnd = {
  end: endings.stepLimit,
} satisfies TurnEndRowProps;

export const refusedTurnEnd = {
  end: endings.refused,
} satisfies TurnEndRowProps;

export const erroredTurnEnd = { end: endings.error } satisfies TurnEndRowProps;

export const erroredWithoutDetailsTurnEnd = {
  end: endings.errorWithoutDetails,
} satisfies TurnEndRowProps;

export const authenticationRequiredTurnEnd = {
  end: endings.authenticationRequired,
} satisfies TurnEndRowProps;
