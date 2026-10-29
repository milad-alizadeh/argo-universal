import {
  operations,
  describeOperation,
  type OperationDescription,
  type OperationRow,
} from '@repo/contracts/operations';

// Described once as the Engine loads, so an Operation whose schema cannot be described fails at startup, not on every listing.
const descriptions: readonly OperationDescription[] =
  Object.values(operations).map(describeOperation);

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
