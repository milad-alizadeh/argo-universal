import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/argo.mjs', import.meta.url));

type CliResult = { code: number | string; stdout: string; stderr: string };

function environmentFor(
  home: string,
  token: string | undefined,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ARGO_HOME: home };
  delete env.ARGO_TOKEN;

  if (token !== undefined) env.ARGO_TOKEN = token;

  return env;
}

type CliProcessOptions = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeout: number;
};

export function runCli(
  home: string,
  args: string[],
  token?: string,
): Promise<CliResult> {
  const options = {
    cwd: tmpdir(),
    env: environmentFor(home, token),
    timeout: 20_000,
  };

  return executeCli(args, options);
}

function executeCli(
  args: string[],
  options: CliProcessOptions,
): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [bin, ...args],
      options,
      (error, stdout, stderr) =>
        resolve({ code: error?.code ?? 0, stdout, stderr }),
    );
  });
}
