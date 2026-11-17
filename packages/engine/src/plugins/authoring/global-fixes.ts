const viaFetch = 'call argo.fetch, or read a fetch Query';

const jiraEncoding = 'plugins/jira/atlassian.ts';

const utf8Bytes = `take UTF-8 bytes from encodeURIComponent, as ${jiraEncoding} does`;

const ownFiles = 'read the Plugin’s own files with argo.fs';

// What a Plugin uses instead of a Node or web global its realm lacks, named in the refusal so the fix is in the message.
const fixes = new Map([
  ['fetch', viaFetch],
  ['Request', viaFetch],
  ['Response', viaFetch],
  ['Headers', 'pass headers to argo.fetch as a plain object'],
  [
    'URL',
    `read a URL with string methods or a RegExp, as siteHost in ${jiraEncoding} does, and build one with encodeURIComponent`,
  ],
  [
    'URLSearchParams',
    'build a query string with encodeURIComponent, and read one with split',
  ],
  ['btoa', `write base64 by hand, as basicCredential in ${jiraEncoding} does`],
  [
    'atob',
    `read base64 by hand, the reverse of basicCredential in ${jiraEncoding}`,
  ],
  ['Buffer', utf8Bytes],
  ['TextEncoder', utf8Bytes],
  ['TextDecoder', 'decode UTF-8 bytes with decodeURIComponent'],
  [
    'setInterval',
    'give the page `every`, declare a Watch, or chain setTimeout calls',
  ],
  ['setImmediate', 'use setTimeout'],
  ['queueMicrotask', 'await Promise.resolve()'],
  ['structuredClone', 'copy JSON with JSON.parse(JSON.stringify(value))'],
  [
    'process',
    'run a command with argo.process.run, and read configuration with argo.settings.get',
  ],
  [
    'crypto',
    'let argo.oauth.start make the PKCE values, and keep tokens with argo.secrets',
  ],
  ['AbortController', 'leave deadlines to argo, whose calls each have one'],
  ['require', 'import the module'],
  ['__dirname', ownFiles],
  ['__filename', ownFiles],
]);

// The refusal for a global the Plugin realm lacks, with what to use instead.
export function unavailableGlobalMessage(name: string): string {
  const fix = fixes.get(name) ?? 'use argo or JavaScript’s own built-ins';

  return `Node global ${name} is unavailable: a Plugin has only JavaScript’s own built-ins, setTimeout and argo. Instead, ${fix}.`;
}
