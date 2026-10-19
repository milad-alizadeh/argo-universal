import type { WireNode } from '@repo/contracts/plugins/wire';
import { type Program, type JSXElement, type VisitorObject } from 'oxc-parser';
import { parseSvg } from '../svg/parser';
import { sanitizeSvg } from '../svg/sanitizer';
import { drawingReason } from '../visual/canvas-validation';
import { visualSchemas } from '../visual/props';
import { visualReason } from '../visual/validation';
import { canvasChildren } from './canvas';
import type { SourceFile, PluginDiagnostic } from './diagnostics';
import { sourceDiagnostic } from './diagnostics';
import { visualImports, visualName } from './visual-imports';
import { visualTree, propsOf, requiredPropReason } from './visual-tree';

export function visualSourceVisitor(
  input: SourceFile,
  diagnostics: PluginDiagnostic[],
  program: Program,
): VisitorObject {
  const names = visualImports(program);
  const contained = canvasChildren(program, names);

  return {
    JSXElement: (node): void =>
      report(node, { input, diagnostics, names, contained }),
  };
}

type SourceInspection = {
  input: SourceFile;
  diagnostics: PluginDiagnostic[];
  names: Map<string, string>;
  contained: Set<JSXElement>;
};

function report(node: JSXElement, context: SourceInspection): void {
  const type = visualName(node.openingElement, context.names);

  if (!type) return;
  const reason = inspect(node, { ...context, type });

  if (reason)
    context.diagnostics.push(
      sourceDiagnostic(context.input, node.start, `${type} node: ${reason}`),
    );
}

type Inspection = {
  type: string;
  names: Map<string, string>;
  contained: Set<JSXElement>;
};

// Production's visual rules, in its order, on the tree read from source; then what only source shows.
function inspect(node: JSXElement, context: Inspection): string | undefined {
  return (
    svgReason(node, context.type) ??
    productionReason(node, context) ??
    missingProp(node, context)
  );
}

function svgReason(node: JSXElement, type: string): string | undefined {
  return type === 'Svg'
    ? markupReason(propsOf(node.openingElement).xml)
    : undefined;
}

function markupReason(
  xml: WireNode['props'][string] | undefined,
): string | undefined {
  if (typeof xml !== 'string') return;

  const result = sanitizeSvg(xml, parseSvg);

  return result.ok ? undefined : result.reason;
}

function productionReason(
  node: JSXElement,
  context: Inspection,
): string | undefined {
  const tree = visualTree(node, context.names);

  return context.contained.has(node)
    ? drawingReason(tree, true)
    : visualReason(tree, true);
}

function missingProp(
  node: JSXElement,
  context: Inspection,
): string | undefined {
  const schema = visualSchemas.get(context.type);

  return schema ? requiredPropReason(node.openingElement, schema) : undefined;
}
