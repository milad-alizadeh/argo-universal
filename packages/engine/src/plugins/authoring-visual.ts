import { type Program, type JSXElement, type VisitorObject } from 'oxc-parser';
import { canvasChildren } from './authoring-canvas';
import type { SourceFile, PluginDiagnostic } from './authoring-diagnostics';
import { sourceDiagnostic } from './authoring-diagnostics';
import { visualImports, visualName } from './authoring-visual-imports';
import {
  visualTree,
  propsOf,
  requiredPropReason,
} from './authoring-visual-tree';
import { canvasReason } from './canvas-validation';
import { parseSvg } from './svg-parser';
import { sanitizeSvg } from './svg-sanitizer';
import { visualPropsReason, visualSchemas } from './visual-props';

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

function inspect(node: JSXElement, context: Inspection): string | undefined {
  const invalid = invalidPlacement(node, context);

  if (invalid) return invalid;

  return inspectContent(node, context) ?? inspectProps(node, context.type);
}

function inspectProps(node: JSXElement, type: string): string | undefined {
  const props = propsOf(node.openingElement);
  delete props.key;

  return visualPropsReason(type, props, true) ?? missingProp(node, type);
}

function inspectContent(
  node: JSXElement,
  context: Inspection,
): string | undefined {
  if (context.type === 'Canvas')
    return canvasReason(visualTree(node, context.names), true);

  return context.type === 'Svg' ? svgReason(node) : undefined;
}

function svgReason(node: JSXElement): string | undefined {
  const xml = propsOf(node.openingElement).xml;

  if (typeof xml !== 'string') return;
  const result = sanitizeSvg(xml, parseSvg);

  return result.ok ? undefined : result.reason;
}

function outsideCanvas(node: JSXElement, context: Inspection): boolean {
  return context.type.startsWith('Canvas.') && !context.contained.has(node);
}

function invalidPlacement(
  node: JSXElement,
  context: Inspection,
): string | undefined {
  if (context.type === 'CodeMap')
    return 'unsupported CodeMap; use Canvas (ADR-0028)';

  if (outsideCanvas(node, context))
    return 'shapes are only valid inside Canvas';

  return unknownDrawing(context.type);
}

function missingProp(node: JSXElement, type: string): string | undefined {
  const schema = visualSchemas.get(type);

  return schema ? requiredPropReason(node.openingElement, schema) : undefined;
}

function unknownDrawing(type: string): string | undefined {
  return type.startsWith('Canvas.') && !visualSchemas.has(type)
    ? `shape ${type} refused`
    : undefined;
}
