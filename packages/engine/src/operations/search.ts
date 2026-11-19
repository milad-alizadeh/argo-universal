import {
  operations,
  describeOperation,
  type OperationDescription,
  type OperationRow,
} from '@repo/contracts/operations';
import { isAppOnly } from './app-only';

// Described once as the Engine loads, so an Operation whose schema cannot be described fails at startup, not on every listing.
const described: readonly OperationDescription[] =
  Object.values(operations).map(describeOperation);

// Only an App runs the App-only ones, and an App does not list.
const descriptions = described.filter(
  ({ id }) => !isAppOnly(id),
);

function matches(operation: OperationDescription, search: string): boolean {
  return [operation.id, operation.label, ...operation.keywords].some((value) =>
    value.toLowerCase().includes(search),
  );
}

export function listOperations(filter: string): OperationRow[] {
  return descriptions
    .values()
    .filter((operation) => matches(operation, filter.toLowerCase()))
    .map((operation): OperationRow => ({
      ...operation,
      enabled: true,
      disabledReason: null,
    }))
    .toArray();
}
