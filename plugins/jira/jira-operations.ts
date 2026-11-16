import type { Argo } from '@argo/plugin-kit';
import { siteHost } from './atlassian';
import type { JiraProject } from './jira-readers';
import type { JiraReads, SiteTarget } from './jira-reads';
import type { JiraSignIn } from './jira-sign-in';
import { siteOf } from './jira-sites';
import {
  chooseProject,
  chooseSite,
  forgetProject,
  keepSite,
  type JiraSite,
} from './jira-store';

type Deps = { argo: Argo; reads: JiraReads; signIn: JiraSignIn };

// The Jira project's name as Jira lists it, or its key when the list cannot be read.
async function listedProjects(
  { argo, reads }: Deps,
  target: SiteTarget,
): Promise<JiraProject[]> {
  const options = { projectId: target.projectId };

  const answer = await argo.queries
    .read(reads.projects(target), options)
    .catch(() => null);

  return answer?.ok ? answer.value : [];
}

type ProjectTarget = SiteTarget & { key: string };

async function projectName(deps: Deps, target: ProjectTarget): Promise<string> {
  const listed = await listedProjects(deps, target);

  return listed.find(({ key }) => key === target.key)?.name ?? target.key;
}

async function chosenProject(
  deps: Deps,
  target: ProjectTarget,
): Promise<{ key: string; name: string }> {
  const name = await projectName(deps, target);

  await chooseProject(deps.argo, { ...target, name });

  return { key: target.key, name };
}

async function foundSite(argo: Argo, site: string): Promise<JiraSite> {
  const host = siteHost(site);

  if (!host)
    throw new Error('Enter a Jira site, such as your-team.atlassian.net.');

  const found = await siteOf(argo, host);

  if (!found)
    throw new Error(
      `Couldn’t find a Jira site at ${host}. Check its address and try again.`,
    );

  return found;
}

async function addSite(
  argo: Argo,
  { site, projectId }: { site: string; projectId: string },
): Promise<JiraSite> {
  const found = await foundSite(argo, site);

  await keepSite(argo, found);
  await chooseSite(argo, { projectId, cloudId: found.cloudId });

  return found;
}

function registerChoices(deps: Deps): void {
  const { argo } = deps;

  argo.operations.register('addSite', ({ site }, { projectId }) =>
    addSite(argo, { site, projectId }),
  );
  argo.operations.register('chooseSite', ({ cloudId }, { projectId }) =>
    chooseSite(argo, { projectId, cloudId }).then(() => ({ cloudId })),
  );
  argo.operations.register('chooseProject', ({ cloudId, key }, { projectId }) =>
    chosenProject(deps, { projectId, cloudId, key }),
  );
}

/*
 * The Plugin's Operations (ADR-0044): every choice a page makes is one, so an Agent can make it through `argo run`
 * too. Each run marks the pages' reads due, so the pages that show the choice draw again.
 */
export function registerOperations(deps: Deps): void {
  const { argo, signIn } = deps;

  argo.operations.register('signIn', async (params) => ({
    state: (await signIn.paste(params)).kind,
  }));
  registerChoices(deps);
  argo.operations.register('forgetProject', async (_params, { projectId }) => {
    await forgetProject(argo, projectId);

    return {};
  });
  // The run itself makes every read due, so the pages read Jira again.
  argo.operations.register('checkAgain', () => ({}));
}
