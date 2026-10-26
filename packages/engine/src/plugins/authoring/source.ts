import { type PluginManifest } from '@repo/contracts/plugins';
import { AddOnlySlotId, ReplaceableSlotId } from '@repo/contracts/plugins/wire';
import {
  parseSync,
  Visitor,
  type CallExpression,
  type Program,
} from 'oxc-parser';
import { declaresSlot } from '../discovery/plugin-contributions';
import { registrationNames, canonicalCall } from './bindings';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './diagnostics';
import { firstString, memberPath } from './expressions';
import { hookSourceReason } from './hooks';
import { visualSourceVisitor } from './visual';

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
  bindings: Set<string>;
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
  const bindings = registrationNames(program);
  new Visitor({
    ...visualSourceVisitor(input, report.diagnostics, program),
    CallExpression: (node): void =>
      inspectCall({ input, manifest, report, bindings }, node),
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
  const name = canonicalCall(memberPath(node.callee), context.bindings);

  if (!name.startsWith('argo.')) return;
  context.report.calls.push(name);
  callInspectors.get(name)?.(context, node);
}

function inspectHook(context: Inspection, node: CallExpression): void {
  const name = firstString(node);

  if (name !== undefined) context.report.hooks.push(name);
  const reason = hookSourceReason(node, context.manifest);

  if (reason) refuse(context, node, reason);
}

function inspectSlot(context: Inspection, node: CallExpression): void {
  const slotId = firstString(node);

  if (slotId === undefined) return;
  context.report.slots.push(slotId);

  const reason = slotReason(context.manifest, slotId);

  if (reason) refuse(context, node, reason);
}

function slotReason(
  manifest: PluginManifest,
  slotId: string,
): string | undefined {
  if (ReplaceableSlotId.safeParse(slotId).success)
    return `Replaceable Slot ${slotId} is drawn through ui.render, not slots.register`;

  return addOnlySlotReason(manifest, slotId);
}

function addOnlySlotReason(
  manifest: PluginManifest,
  slotId: string,
): string | undefined {
  const parsed = AddOnlySlotId.safeParse(slotId);

  if (!parsed.success) return `Unknown Slot ${slotId}`;

  return declaresSlot(manifest, parsed.data)
    ? undefined
    : `Undeclared Slot ${slotId}`;
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
