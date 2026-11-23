import { CapabilityRefusal } from './capability-refusal';

const prefix = [
  'gh',
  'api',
  '--hostname',
  'github.com',
  '--method',
  'GET',
  '--include',
  '--',
];

const repositoryPart = /^repos\/[\w-]+\/(?!\.{1,2}(?:\/|\?|$))[\w.-]+/;

const readPath =
  /^(?:\/pulls(?:\/[1-9]\d*(?:\/files)?)?|\/commits\/[a-f\d]{7,40}\/check-runs)?$/i;

const readQuery = /^[\w%&=.~!'()*-]*$/;

function isReadEndpoint(endpoint: string): boolean {
  const repository = repositoryPart.exec(endpoint)?.[0];

  if (!repository) return false;

  const [path = '', query = '', extra] = endpoint
    .slice(repository.length)
    .split('?');

  return extra === undefined && readPath.test(path) && readQuery.test(query);
}

// Restrict the declared read form even when a spawn Hook rewrites the endpoint.
export function checkGitHubCliRead(argv: readonly string[]): void {
  if (!prefix.every((arg, index) => argv[index] === arg)) return;

  const endpoint = argv[prefix.length] ?? '';

  if (argv.length !== prefix.length + 1 || !isReadEndpoint(endpoint))
    throw new CapabilityRefusal(
      'This GitHub CLI command must read a repository, pull request or Checks.',
    );
}
