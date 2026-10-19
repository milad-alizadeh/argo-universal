export type PluginDiagnostic = {
  file: string;
  line: number;
  column: number;
  message: string;
};

export type SourceFile = { file: string; source: string; commonJs?: boolean };

export function sourceDiagnostic(
  input: SourceFile,
  offset: number,
  message: string,
): PluginDiagnostic {
  const lines = input.source.slice(0, offset).split('\n');

  return {
    file: input.file,
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
    message,
  };
}
