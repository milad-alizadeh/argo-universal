import { createRejectionCounter } from '@repo/machine-log';
import { acpResponses } from '@repo/mocks/agent/response-scenarios';
import { expect, it } from 'vitest';
import { createAcpResponseReaders } from './response-readers';

it.each(Object.values(acpResponses))(
  'accepts the official $method response without changing its contents',
  (example) => {
    const rejections = createRejectionCounter('ACP responses');
    const readers = createAcpResponseReaders(rejections);
    expect(readers[example.method].parse(example.response)).toEqual(
      example.response,
    );
    expect(rejections.count()).toBe(0);
  },
);

it.each(Object.values(acpResponses))(
  'rejects and counts an invalid $method response body once',
  (example) => {
    const rejections = createRejectionCounter('ACP responses');
    const readers = createAcpResponseReaders(rejections);
    expect(() => readers[example.method].parse(42)).toThrow(
      'data must be object',
    );
    expect(rejections.count()).toBe(1);
  },
);

it.each([
  { name: 'arguments', additions: { args: ['--login', 42] } },
  { name: 'environment', additions: { env: { CODEX_HOME: 42 } } },
])(
  'rejects and counts malformed terminal $name instead of treating the method as protocol authentication',
  ({ additions }) => {
    const rejections = createRejectionCounter('ACP terminal methods');
    const readers = createAcpResponseReaders(rejections);

    const response = {
      protocolVersion: 1,
      authMethods: [
        { type: 'terminal', id: 'terminal', name: 'Terminal', ...additions },
      ],
    };

    expect(() => readers.initialize.parse(response)).toThrow(
      'Invalid ACP InitializeResponse',
    );
    expect(rejections.count()).toBe(1);
  },
);
