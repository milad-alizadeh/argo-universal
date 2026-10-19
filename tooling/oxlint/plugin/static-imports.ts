import { defineRule } from '@oxlint/plugins';
import type { ESTree, Visitor } from '@oxlint/plugins';
import { stringValue } from './syntax.ts';

const deferredRenderers = new Set([
  './three/three-map.web',
  './flat/flat-map.web',
]);

const isRendererLoader = (filename: string): boolean =>
  filename
    .replaceAll('\\', '/')
    .endsWith(
      '/apps/codemap-834-prototype/src/code-map/renderer-loader.web.tsx',
    );

const isDeferredRenderer = (node: ESTree.ImportExpression): boolean =>
  node.source.type === 'Literal' &&
  deferredRenderers.has(stringValue(node.source));

function isCanvasLoader(
  filename: string,
  node: ESTree.ImportExpression,
): boolean {
  const canvasLoader =
    '/packages/client/src/lib/generic/primitives/visual/canvas/canvas-loader.web.tsx';

  return (
    filename.replaceAll('\\', '/').endsWith(canvasLoader) && canvasImport(node)
  );
}

function canvasImport(node: ESTree.ImportExpression): boolean {
  return (
    node.source.type === 'Literal' &&
    stringValue(node.source) === './canvas-renderer'
  );
}

export const staticImports = defineRule({
  meta: {
    type: 'problem',
    messages: {
      staticImports:
        'Use a top-level static import or import type declaration.',
    },
  },
  create: (context): Visitor => ({
    ImportExpression: (node): void => {
      // ADR-0017 permits only these two deferred prototype renderers.
      if (isPrototypeImport(context.filename, node)) return;

      if (isCanvasLoader(context.filename, node)) return;
      context.report({ node, messageId: 'staticImports' });
    },
    TSImportType: (node): void =>
      context.report({ node, messageId: 'staticImports' }),
  }),
});

function isPrototypeImport(
  filename: string,
  node: ESTree.ImportExpression,
): boolean {
  return isRendererLoader(filename) && isDeferredRenderer(node);
}
