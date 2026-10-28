import {
  operations,
  describeOperation,
  type OperationRow,
  type OperationDefinition,
} from '@repo/contracts/operations';

function matches(operation: OperationDefinition, search: string): boolean {
  return [operation.id, operation.label, ...operation.keywords].some((value) =>
    value.toLowerCase().includes(search),
  );
}

export function listOperations(filter: string): OperationRow[] {
  return Object.values(operations)
    .filter((operation) => matches(operation, filter.toLowerCase()))
    .map((operation): OperationRow => ({
      ...describeOperation(operation),
      enabled: true,
      disabledReason: null,
    }));
}
