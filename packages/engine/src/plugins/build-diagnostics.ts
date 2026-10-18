import { resolve } from 'node:path';
import { z } from 'zod';
import type { PluginDiagnostic } from './authoring-diagnostics';

export const BuildError = z.object({
  errors: z.array(
    z.object({
      text: z.string(),
      location: z
        .object({ file: z.string(), line: z.number(), column: z.number() })
        .nullable(),
    }),
  ),
});

type BuildMessage = z.infer<typeof BuildError>['errors'][number];

export function buildDiagnostics(
  entry: { directory: string; main: string },
  error: z.infer<typeof BuildError>,
): PluginDiagnostic[] {
  return error.errors.map((message) => buildDiagnostic(entry, message));
}

function buildDiagnostic(
  entry: { directory: string; main: string },
  message: BuildMessage,
): PluginDiagnostic {
  const location = message.location ?? { file: entry.main, line: 1, column: 0 };

  return {
    file: resolve(entry.directory, inputPath(entry.main, location.file)),
    line: location.line,
    column: location.column + 1,
    message: message.text,
  };
}

function inputPath(main: string, file: string): string {
  return file === '<stdin>' ? main : file;
}
