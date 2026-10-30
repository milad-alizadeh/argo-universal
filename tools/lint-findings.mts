import { z } from 'zod';

const diagnosticSchema = z.object({
  filename: z.string().min(1),
  code: z.string().min(1),
  message: z.string(),
  severity: z.string(),
  help: z.string().optional(),
  labels: z
    .array(
      z.object({ span: z.object({ line: z.number(), column: z.number() }) }),
    )
    .default([]),
});

const reportSchema = z.object({ diagnostics: z.array(diagnosticSchema) });

type Diagnostic = z.infer<typeof diagnosticSchema>;

// The files each allowlisted finding code is waived for, as the full config waives them.
export type Waived = Map<string, ReadonlySet<string>>;

const isWaived = (waived: Waived, { code, filename }: Diagnostic): boolean =>
  waived.get(code)?.has(filename.replaceAll('\\', '/')) ?? false;

/*
 * The findings the full config reports, read from one run that lints the allowlisted files too: every finding,
 * warnings included, less the allowlisted rule's in its allowlisted files.
 */
export const unlistedFindings = (
  report: string,
  waived: Waived,
): Diagnostic[] =>
  reportSchema
    .parse(JSON.parse(report))
    .diagnostics.filter((diagnostic): boolean => !isWaived(waived, diagnostic));

// oxlint's first label marks the finding.
const location = ({ labels }: Diagnostic): string =>
  labels
    .slice(0, 1)
    .map(({ span }): string => `:${span.line}:${span.column}`)
    .join('');

const help = (diagnostic: Diagnostic): string =>
  diagnostic.help === undefined ? '' : `\n  help: ${diagnostic.help}`;

export const formatFinding = (diagnostic: Diagnostic): string =>
  `${diagnostic.filename}${location(diagnostic)}: ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}${help(diagnostic)}`;
