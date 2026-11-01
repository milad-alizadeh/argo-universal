import { defineRule } from '@oxlint/plugins';
import type { ESTree, Visitor } from '@oxlint/plugins';
import { stringValue } from './syntax.ts';

// Each kit loader may import only its own renderer, after `WithSkiaWeb` initializes CanvasKit; the Plugin worker entry may import only `./run.ts`.
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
  ['/packages/engine/src/plugins/worker/process.ts', './run.ts'],
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
      // ADR-0017 permits only each Skia loader's own deferred renderer and the Plugin worker's run module.
      if (isSkiaLoaderImport(context.filename, node)) return;
      context.report({ node, messageId: 'staticImports' });
    },
    TSImportType: (node): void =>
      context.report({ node, messageId: 'staticImports' }),
  }),
});
