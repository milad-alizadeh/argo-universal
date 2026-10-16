const exactVersion = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

export const requireExactPackageVersion = (version: string): string => {
  if (!exactVersion.test(version))
    throw new Error('Registry package must name an exact release');

  return version;
};
