import { expect, it } from 'vitest';
import { seededEnvironment, vendorRegistryIds } from './vendor';

// The checklist is Argo's own Operations (ADR-0053), so no Agent's checklist tool is turned on at install.
it.each([vendorRegistryIds.claude, vendorRegistryIds.codex, 'example-agent'])(
  '%s is installed with an empty launch environment',
  (registryId) => {
    expect(seededEnvironment(registryId)).toEqual({});
  },
);
