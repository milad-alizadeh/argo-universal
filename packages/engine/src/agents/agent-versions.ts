import type { AgentInfo } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readAgentCatalog } from './catalog-sql';

// "v1.2.3" and "1.2.3" are the same release.
const sameVersion = (left: string, right: string): boolean =>
  left.replace(/^v/, '') === right.replace(/^v/, '');

type Versions = Pick<AgentInfo, 'version' | 'agentVersion'>;

// The Adapter is the installed package where one is known, else what the Agent reported; the Agent shows only when it differs.
export const versionsOf = (
  installed: string | undefined,
  reported: string | undefined,
): Versions => {
  const version = installed ?? reported;

  if (!version) return {};

  return reported && !sameVersion(version, reported)
    ? { version, agentVersion: reported }
    : { version };
};

// Each Agent with the catalog's release beside its own versions.
export const withAvailableVersions = (
  database: Database,
  agents: AgentInfo[],
): AgentInfo[] => {
  const catalog = new Map(
    readAgentCatalog(database).agents.map(({ id, entry }) => [
      id,
      entry.version,
    ]),
  );

  return agents.map((info) => {
    const availableVersion = catalog.get(info.agent);

    return availableVersion ? withUpdate({ ...info, availableVersion }) : info;
  });
};

// A Ready copy whose version differs from the catalog's, whoever installed it; any other status needs its own action first.
const withUpdate = (info: AgentInfo): AgentInfo =>
  info.status === 'ready' &&
  info.version !== undefined &&
  info.availableVersion !== undefined &&
  !sameVersion(info.version, info.availableVersion)
    ? { ...info, status: 'update-available' }
    : info;
