import {
  operations,
  describeOperation,
  type OperationDescription,
  type OperationRow,
} from '@repo/contracts/operations';
import { OperationIndex } from './operation-index';

/*
 * Described once as the Engine loads, so an Operation whose schema cannot be described fails at startup, not on every
 * listing. Only an App runs the App-only ones, and an App does not list.
 */
const descriptions: readonly OperationDescription[] = Object.values(operations)
  .filter(({ policy }) => policy !== 'person-only')
  .map(describeOperation);

// Indexed once, as they are described.
const index = new OperationIndex(descriptions);

export function listOperations(filter: string): OperationRow[] {
  return index.ranked(filter).map((operation): OperationRow => ({
    ...operation,
    enabled: true,
    disabledReason: null,
  }));
}
