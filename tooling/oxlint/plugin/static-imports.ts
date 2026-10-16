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
      if (isRendererLoader(context.filename) && isDeferredRenderer(node))
        return;
      context.report({ node, messageId: 'staticImports' });
    },
    TSImportType: (node): void =>
      context.report({ node, messageId: 'staticImports' }),
  }),
});
