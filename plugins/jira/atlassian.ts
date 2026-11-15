/*
 * Atlassian's names the Plugin relies on. The Account is `api.atlassian.com`, which both a scoped API token and an
 * OAuth token open, so a future Confluence Plugin can borrow it; Jira is reached at `/ex/jira/<cloudId>/…` on it.
 */
export const atlassianHost = 'api.atlassian.com';

// Where a person makes an API token. Atlassian takes no scopes in this link, so the page names them.
export const tokenPageUrl =
  'https://id.atlassian.com/manage-profile/security/api-tokens';

/*
 * The scopes a token needs: reading issues, projects and people now, and changing issues for the edits and the board
 * (Spec 0027), so a person makes one token once.
 */
export const tokenScopes = [
  'read:jira-work',
  'read:jira-user',
  'write:jira-work',
] as const;

const siteSuffix = '.atlassian.net';

const siteName = /^[a-z0-9][a-z0-9-]*$/;

// What a person typed for their site, as a bare host: `team`, `team.atlassian.net` or a URL of a page on it.
const hostOf = (typed: string): string =>
  typed
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split(/[/?#:]/)[0] ?? '';

/*
 * The Jira Cloud site a person means, such as `team.atlassian.net`, or null when it is not one. Only Atlassian's own
 * site hosts are reached, so a typo never sends a token anywhere else.
 */
export function siteHost(typed: string): string | null {
  const host = hostOf(typed);
  const name = host.endsWith(siteSuffix)
    ? host.slice(0, -siteSuffix.length)
    : host;

  return siteName.test(name) ? `${name}${siteSuffix}` : null;
}

// The `Authorization` value a scoped API token is sent with: Basic, over the email and token.
export const basicCredential = (email: string, token: string): string =>
  `Basic ${base64(`${email.trim()}:${token.trim()}`)}`;

const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// A Plugin runs with no `btoa` or `TextEncoder`, so the UTF-8 bytes come from `encodeURIComponent`.
const utf8 = (text: string): number[] =>
  [...encodeURIComponent(text).matchAll(/%([0-9A-F]{2})|./g)].map((match) =>
    match[1] ? Number.parseInt(match[1], 16) : match[0].charCodeAt(0),
  );

const sextet = (bits: number, shift: number): string =>
  alphabet[(bits >> shift) & 63] ?? '';

function base64(text: string): string {
  const bytes = utf8(text);
  let encoded = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const [a = 0, b = 0, c = 0] = bytes.slice(index, index + 3);
    const bits = (a << 16) | (b << 8) | c;
    const left = bytes.length - index;

    encoded += sextet(bits, 18) + sextet(bits, 12);
    encoded += left > 1 ? sextet(bits, 6) : '=';
    encoded += left > 2 ? sextet(bits, 0) : '=';
  }

  return encoded;
}

// Atlassian's public answer to which cloud a site is; it needs no sign-in.
export const tenantInfoUrl = (host: string): string =>
  `https://${host}/_edge/tenant_info`;

// Jira's REST API for one site, through the Account's host.
export const jiraApiUrl = (cloudId: string, path: string): string =>
  `https://${atlassianHost}/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3${path}`;

// The same API on the site itself, which only an unscoped token opens.
export const siteApiUrl = (host: string, path: string): string =>
  `https://${host}/rest/api/3${path}`;

// An issue's page in Jira.
export const issueUrl = (host: string, key: string): string =>
  `https://${host}/browse/${encodeURIComponent(key)}`;
