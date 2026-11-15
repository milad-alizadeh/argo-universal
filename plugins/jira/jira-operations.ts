import type { Argo } from '@argo/plugin-kit';
import { siteHost } from './atlassian';
import type { JiraReads } from './jira-reads';
import type { JiraSignIn } from './jira-sign-in';
import { siteOf } from './jira-sites';
import {
  chooseProject,
  chooseSite,
  forgetProject,
  keepSite,
} from './jira-store';

// The Jira project's name as Jira lists it, or its key when the list cannot be read.
async function projectName(
  argo: Argo,
  reads: JiraReads,
  target: { projectId: string; cloudId: string; key: string },
): Promise<string> {
  const answer = await argo.queries
    .read(reads.projects(target), { projectId: target.projectId })
    .catch(() => null);

  const found = answer?.ok
    ? answer.value.find(({ key }) => key === target.key)
    : undefined;

  return found?.name ?? target.key;
}

async function addSite(
  argo: Argo,
  { site, projectId }: { site: string; projectId: string },
): Promise<{ cloudId: string; host: string }> {
  const host = siteHost(site);

  if (!host)
    throw new Error('Enter a Jira site, such as your-team.atlassian.net.');

  const found = await siteOf(argo, host);

  if (!found)
    throw new Error(
      `Couldn’t find a Jira site at ${host}. Check its address and try again.`,
    );

  await keepSite(argo, found);
  await chooseSite(argo, projectId, found.cloudId);

  return found;
}

/*
 * The Plugin's Operations (ADR-0044): every choice a page makes is one, so an Agent can make it through `argo run`
 * too. Each run marks the pages' reads due, so the pages that show the choice draw again.
 */
export function registerOperations(
  argo: Argo,
  { reads, signIn }: { reads: JiraReads; signIn: JiraSignIn },
): void {
  argo.operations.register('signIn', async (params) => ({
    state: (await signIn.paste(params)).kind,
  }));

  argo.operations.register('addSite', ({ site }, { projectId }) =>
    addSite(argo, { site, projectId }),
  );

  argo.operations.register('chooseSite', async ({ cloudId }, { projectId }) => {
    await chooseSite(argo, projectId, cloudId);

    return { cloudId };
  });

  argo.operations.register(
    'chooseProject',
    async ({ cloudId, key }, { projectId }) => {
      const name = await projectName(argo, reads, { projectId, cloudId, key });

      await chooseProject(argo, projectId, { cloudId, key, name });

      return { key, name };
    },
  );

  argo.operations.register('forgetProject', async (_params, { projectId }) => {
    await forgetProject(argo, projectId);

    return {};
  });

  // The run itself makes every read due, so the pages read Jira again.
  argo.operations.register('checkAgain', () => ({}));
}
