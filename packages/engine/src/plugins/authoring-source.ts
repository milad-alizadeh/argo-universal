import { HookEventName, type PluginManifest } from '@repo/contracts/plugins';
import { SlotId } from '@repo/contracts/plugins/wire';
import {
  parseSync,
  Visitor,
  type CallExpression,
  type Program,
} from 'oxc-parser';
import type { z } from 'zod';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './authoring-diagnostics';
import { firstString, memberPath } from './authoring-expressions';
import { visualSourceVisitor } from './authoring-visual';

export type PluginSourceReport = {
  calls: string[];
  hooks: string[];
  slots: string[];
  diagnostics: PluginDiagnostic[];
};

type Inspection = {
  input: SourceFile;
  manifest: PluginManifest;
  report: PluginSourceReport;
};

export const emptySourceReport = (): PluginSourceReport => ({
  calls: [],
  hooks: [],
  slots: [],
  diagnostics: [],
});

export function inspectSource(
  input: SourceFile,
  manifest: PluginManifest,
): PluginSourceReport {
  const report = emptySourceReport();
  const program = sourceProgram(input);
  new Visitor({
    ...visualSourceVisitor(input, report.diagnostics, program),
    CallExpression: (node): void =>
      inspectCall({ input, manifest, report }, node),
  }).visit(program);

  return report;
}

const callInspectors = new Map<
  string,
  (context: Inspection, node: CallExpression) => void
>([
  ['argo.on', inspectHook],
  ['argo.slots.register', inspectSlot],
]);

function inspectCall(context: Inspection, node: CallExpression): void {
  const name = memberPath(node.callee);

  if (!name.startsWith('argo.')) return;
  context.report.calls.push(name);
  callInspectors.get(name)?.(context, node);
}

type Contribution = {
  kind: string;
  schema: z.ZodType<string>;
  declared: readonly string[];
  uses: string[];
};

function inspectHook(context: Inspection, node: CallExpression): void {
  inspectContribution(context, node, {
    kind: 'Hook',
    schema: HookEventName,
    declared: context.manifest.contributes.hooks ?? [],
    uses: context.report.hooks,
  });
}

function inspectSlot(context: Inspection, node: CallExpression): void {
  inspectContribution(context, node, {
    kind: 'Slot',
    schema: SlotId,
    declared: context.manifest.contributes.slots ?? [],
    uses: context.report.slots,
  });
}

function inspectContribution(
  context: Inspection,
  node: CallExpression,
  contribution: Contribution,
): void {
  const value = firstString(node);

  if (value === undefined) return;
  contribution.uses.push(value);
  const parsed = contribution.schema.safeParse(value);

  if (!parsed.success)
    return refuse(context, node, `Unknown ${contribution.kind} event ${value}`);
  requireDeclared(context, node, { ...contribution, value });
}

function requireDeclared(
  context: Inspection,
  node: CallExpression,
  contribution: Contribution & { value: string },
): void {
  if (contribution.declared.includes(contribution.value)) return;
  refuse(
    context,
    node,
    `Undeclared ${contribution.kind} ${contribution.value}`,
  );
}

function refuse(
  context: Inspection,
  node: CallExpression,
  message: string,
): void {
  context.report.diagnostics.push(
    sourceDiagnostic(context.input, node.start, message),
  );
}

function sourceProgram(input: SourceFile): Program {
  return parseSync(input.file, input.source, {
    lang: input.file.endsWith('.ts') ? 'ts' : 'tsx',
  }).program;
}
