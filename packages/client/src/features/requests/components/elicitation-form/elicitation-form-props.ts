import type {
  PendingElicitation,
  SessionAnswerElicitationInput,
} from '@repo/contracts';
import type { RequestState } from '../request-card/request-card';
import type { ElicitationValues } from './elicitation-schema';

export type ElicitationAnswer = Pick<
  SessionAnswerElicitationInput,
  'action' | 'content'
>;

export interface ElicitationFormProps {
  request: PendingElicitation;
  initialValues?: ElicitationValues;
  onAnswer: (answer: ElicitationAnswer) => void;
  source?: string;
  state: RequestState;
  error?: string;
}
