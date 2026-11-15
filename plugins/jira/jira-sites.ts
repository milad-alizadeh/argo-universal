import type { Argo } from '@argo/plugin-kit';
import { tenantInfoUrl } from './atlassian';
import type { JiraSite } from './jira-store';
import { at, parseJson, text } from './json';

/*
 * The site's cloud id, from Atlassian's public tenant info, which needs no sign-in; null when the host is no Jira
 * site or cannot be reached.
 */
export async function siteOf(
  argo: Pick<Argo, 'fetch'>,
  host: string,
): Promise<JiraSite | null> {
  const reply = await argo
    .fetch(tenantInfoUrl(host), { headers: { Accept: 'application/json' } })
    .catch(() => null);

  const cloudId = reply?.ok ? text(at(parseJson(reply.body), 'cloudId')) : null;

  return cloudId ? { cloudId, host } : null;
}
