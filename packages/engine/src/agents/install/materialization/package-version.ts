const exactVersions = {
  npx: /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/,
  uvx: /^(?:\d+!)?\d+(?:\.\d+)*(?:(?:a|b|rc)\d+)?(?:\.post\d+)?(?:\.dev\d+)?$/i,
};

const acceptsLocalVersion = (version: string | undefined): boolean =>
  version === undefined || /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/i.test(version);

const acceptsPublicVersion = (version: string | undefined): boolean =>
  exactVersions.uvx.test(version ?? '');

const acceptsPythonVersion = (version: string): boolean => {
  const parts = version.split('+');

  return (
    parts.length <= 2 &&
    acceptsPublicVersion(parts[0]) &&
    acceptsLocalVersion(parts[1])
  );
};

const acceptsVersion = (version: string, kind: 'npx' | 'uvx'): boolean =>
  kind === 'npx'
    ? exactVersions.npx.test(version)
    : acceptsPythonVersion(version);

export const requireExactPackageVersion = (
  version: string,
  kind: 'npx' | 'uvx',
): string => {
  if (!acceptsVersion(version, kind))
    throw new Error('Registry package must name an exact release');

  return version;
};
