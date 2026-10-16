import type {
  ElicitationAcceptAction,
  ElicitationContentValue,
} from '@agentclientprotocol/sdk';

// Session admission names an accepted answer's shape here, so only the translator imports the SDK.
export type ElicitationAnswerContent = NonNullable<
  ElicitationAcceptAction['content']
>;

export type ElicitationAnswerValue = ElicitationContentValue;
