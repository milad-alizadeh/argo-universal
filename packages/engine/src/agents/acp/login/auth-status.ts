import type { ParamsParser } from '@agentclientprotocol/sdk';
import type { AuthStatusUpdateNotification } from '@repo/contracts';
import schema from '@repo/contracts/auth-status-schema' with { type: 'json' };
import { createRejectionCounter } from '@repo/machine-log';
import { Ajv } from 'ajv';
import { compileSchema } from '../connection/schema-reader';

const compiled = compileSchema<AuthStatusUpdateNotification>(
  new Ajv({ strict: false }),
  schema,
  {
    rejected: 'Rejected authentication status',
    invalid: (): string => 'Invalid ACP authentication status',
  },
);

const reader = compiled.reader(
  createRejectionCounter('ACP authentication status'),
);

export const authStatusNotification = '_auth/status_update';

export const createAuthStatusReader = (
  reject: () => void = () => {},
): ParamsParser<AuthStatusUpdateNotification> => ({
  parse: (value): AuthStatusUpdateNotification => {
    if (compiled.accepts(value)) return value;
    reject();

    return reader.parse(value);
  },
});
