type AuthenticationContext = {
  executable: string;
  authContext: string;
  env: Readonly<Record<string, string>>;
};
const accountEnvironment = [
  'HOME',
  'USERPROFILE',
  'CODEX_HOME',
  'CLAUDE_CONFIG_DIR',
  'XDG_CONFIG_HOME',
];

export const authenticationContextKey = (
  launch: AuthenticationContext,
): string =>
  JSON.stringify([
    launch.executable,
    launch.authContext,
    accountEnvironment.map((name) => [name, launch.env[name] ?? null]),
  ]);

export class ResourceInUseError extends Error {
  public constructor(message = 'Agent account is in use') {
    super(message);
  }
}
