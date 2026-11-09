import {
  publishedRegistryResponse,
  rejectedRegistryValues,
} from '@repo/mocks/registry/published';
import { expect, it } from 'vitest';
import { createRegistryReader } from './registry-reader';

it('accepts the official published empty placeholder without stripping metadata', (): void => {
  const reader = createRegistryReader();
  const registry = reader.parse(JSON.stringify(publishedRegistryResponse));
  expect(registry).toEqual(publishedRegistryResponse);
  expect(registry.extensions).toEqual([]);
  expect(reader.count()).toBe(0);
});

it.each(['linux-aarch64-musl', 'linux-x86_64-musl'])(
  'accepts a binary Agent published for %s',
  (platform): void => {
    const reader = createRegistryReader();
    const binary = {
      [platform]: {
        archive: `https://example.com/agent-${platform}.tar.gz`,
        cmd: './agent',
        args: ['--acp'],
      },
    };
    const value = {
      ...publishedRegistryResponse,
      agents: [
        { ...publishedRegistryResponse.agents[0], distribution: { binary } },
      ],
    };
    expect(reader.parse(JSON.stringify(value))).toEqual(value);
    expect(reader.count()).toBe(0);
  },
);

it.each(rejectedRegistryValues.map((value, index) => [index, value] as const))(
  'rejects and counts unsupported metadata %i once at ingress',
  (_, value): void => {
    const reader = createRegistryReader();
    expect(() => reader.parse(JSON.stringify(value))).toThrow(
      'Registry metadata is malformed',
    );
    expect(reader.count()).toBe(1);
  },
);
