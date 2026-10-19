// A Project's GitHub repository, as owner/name, from its origin URL.
export function githubRepositoryFromOrigin(
  originUrl: string | null | undefined,
): string | null {
  if (typeof originUrl !== 'string') return null;

  return githubRepositoryFromMatch(originUrl);
}

function githubRepositoryFromMatch(originUrl: string): string | null {
  const match =
    /^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/(?:git@)?github\.com\/)([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?$/i.exec(
      originUrl,
    );

  const [, owner, name] = match ?? [];

  return validRepositoryParts(owner, name);
}

function validRepositoryParts(
  owner: string | undefined,
  name: string | undefined,
): string | null {
  if (hasInvalidRepositoryParts(owner, name)) return null;

  return `${owner}/${name}`;
}

function hasInvalidRepositoryParts(
  owner: string | undefined,
  name: string | undefined,
): boolean {
  const validOwner = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(
    owner ?? '',
  );

  const validName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name ?? '');

  return ![owner, name, validOwner, validName].every(Boolean);
}
