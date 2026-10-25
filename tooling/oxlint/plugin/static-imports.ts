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

// Each kit loader may import only its own renderer, after `WithSkiaWeb` initializes CanvasKit.
const skiaLoaders = new Map([
  [
    '/packages/kit/src/primitives/visual/canvas/canvas-loader.web.tsx',
    './canvas-renderer',
  ],
  [
    '/packages/kit/src/primitives/visual/chart/chart-loader.web.tsx',
    './chart-renderer',
  ],
  [
    '/packages/kit/src/primitives/status/orb/orb-loader.web.tsx',
    './orb-renderer',
  ],
]);

function isSkiaLoaderImport(
  filename: string,
  node: ESTree.ImportExpression,
): boolean {
  const path = filename.replaceAll('\\', '/');
  const loader = [...skiaLoaders.keys()].find((key) => path.endsWith(key));

  return (
    loader !== undefined &&
    node.source.type === 'Literal' &&
    stringValue(node.source) === skiaLoaders.get(loader)
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
      // ADR-0017 permits only these deferred imports: the prototype's two renderers, and each Skia loader's.
      if (isPrototypeImport(context.filename, node)) return;

      if (isSkiaLoaderImport(context.filename, node)) return;
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
