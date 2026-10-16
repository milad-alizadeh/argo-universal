export type InstallRecipe = {
  args: readonly string[];
  env: Record<string, string>;
  kind: 'binary';
  archive: string;
  sha256?: string;
  cmd: string;
};
