// Bun and Node both name the absent executable in the spawn error the Agent prints.
const missingPatterns = [
  /Executable not found in \$PATH: "([^"]+)"/,
  /syscall: "spawn ([^"]+)"/,
];

export interface ExitNotice {
  title: string;
  description: string | undefined;
}

export const missingExecutableIn = (stderr: string): string | undefined =>
  missingPatterns.map((pattern) => pattern.exec(stderr)?.[1]).find(Boolean);

// A missing command reads as one: the command and what to do, never the spawn error and its paths.
export const exitNotice = (
  message: string,
  stderr: string,
  missing: string | undefined,
): ExitNotice =>
  missing
    ? {
        title: `Couldn't start \`${missing}\``,
        description: `\`${missing}\` is not installed. Install it, then send the prompt again.`,
      }
    : { title: message, description: stderr || undefined };
