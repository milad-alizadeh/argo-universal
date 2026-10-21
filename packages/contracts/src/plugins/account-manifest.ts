import { z } from 'zod';
import { sameHost, type PluginCapability } from './capabilities';

type ContributedAccounts = { host: string }[] | undefined;

type DeclaredCapabilities = PluginCapability[] | undefined;

type AccountManifest = {
  contributes: { accounts?: ContributedAccounts };
  capabilities?: DeclaredCapabilities;
};

export function validateAccountCapabilities(
  manifest: AccountManifest,
  context: z.RefinementCtx,
): void {
  for (const [index, { host }] of declaredAccounts(manifest).entries()) {
    if (!hasFetchHost(manifest.capabilities, host))
      context.addIssue({
        code: 'custom',
        path: ['contributes', 'accounts', index, 'host'],
        message: `Account ${host} needs a verbatim fetch Capability for ${host}`,
      });
  }
}

const declaredAccounts = (manifest: AccountManifest): { host: string }[] =>
  manifest.contributes.accounts ?? [];

const hasFetchHost = (
  capabilities: PluginCapability[] | undefined,
  host: string,
): boolean =>
  (capabilities ?? []).some(
    (capability) =>
      capability.kind === 'fetch' && sameHost(capability.host, host),
  );
