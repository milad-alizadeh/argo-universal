import {
  operations,
  describeOperation,
  type OperationDescription,
  type OperationDefinition,
} from '@repo/contracts/operations';

export type OperationRow = OperationDescription & {
  enabled: boolean;
  disabledReason: string | null;
};

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
