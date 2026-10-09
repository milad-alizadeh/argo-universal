export const EXECUTABLE = 'claude';
export function cliEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  delete environment.ANTHROPIC_API_KEY;
  return environment;
}
