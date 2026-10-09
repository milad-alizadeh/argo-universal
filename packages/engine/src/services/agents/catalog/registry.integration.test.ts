import {
  publishedRegistryResponse,
  rejectedRegistryValues,
} from '@repo/mocks/registry/published';
import { expect, it } from 'vitest';
import { createRegistryReader, type RegistryPort } from './registry';

it('accepts the official published empty placeholder without stripping metadata', async (): Promise<void> => {
  const port: RegistryPort = {
    readRegistry: async (): Promise<unknown> =>
      JSON.stringify(publishedRegistryResponse),
  };
  const reader = createRegistryReader();
  const registry = reader.parse(
    await port.readRegistry(new AbortController().signal),
  );
  expect(registry).toEqual(publishedRegistryResponse);
  expect(registry.extensions).toEqual([]);
  expect(reader.count()).toBe(0);
});

it.each(rejectedRegistryValues.map((value, index) => [index, value] as const))(
  'rejects and counts unsupported metadata %i once at ingress',
  (_, value): void => {
    const reader = createRegistryReader();
    expect(() => reader.parse(value)).toThrow('Registry metadata is malformed');
    expect(reader.count()).toBe(1);
  },
);
