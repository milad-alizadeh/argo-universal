// Bun and Node both name the absent executable in the spawn error the Agent prints.
const missingPatterns = [
  /Executable not found in \$PATH: "([^"]+)"/,
  /\bspawn (\S+) ENOENT/,
];

export interface ExitNotice {
  title: string;
  description: string | undefined;
}

// Only the command's name: a path to it would put the filesystem in the Feed.
export const missingExecutableIn = (stderr: string): string | undefined =>
  missingPatterns
    .map((pattern) => pattern.exec(stderr)?.[1])
    .find((command) => command !== undefined)
    ?.split('/')
    .pop();

// A missing command reads as one: the command and what to do, never the spawn error and its paths.
export const exitNotice = (
  message: string,
  stderr: string,
  missingExecutable: string | undefined,
): ExitNotice =>
  missingExecutable
    ? {
        title: `Couldn't start \`${missingExecutable}\``,
        description: `\`${missingExecutable}\` is not installed. Install it, then send the prompt again.`,
      }
    : { title: message, description: stderr || undefined };
