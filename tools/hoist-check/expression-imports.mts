import {
  Visitor,
  type Program,
  type Expression,
  type TSImportType,
  type CallExpression,
  type VisitorObject,
} from 'oxc-parser';
import type { ImportEdge } from './context.mts';
import type { BoundResolver } from './resolve.mts';

type ImportExpressionSource = Expression | CallExpression['arguments'][number];
type AppendImport = (specifier: string | undefined, name?: string) => void;

function qualifierName(qualifier: TSImportType['qualifier']): string {
  if (!qualifier) return '*';
  return qualifier.type === 'Identifier'
    ? qualifier.name
    : qualifierName(qualifier.left);
}

function literalValue(expression: ImportExpressionSource): string | undefined {
  if (expression.type !== 'Literal') return;
  return typeof expression.value === 'string' ? expression.value : undefined;
}

function literalSpecifier(
  expression: ImportExpressionSource | undefined,
): string | undefined {
  return expression ? literalValue(expression) : undefined;
}

function importVisitor(append: AppendImport): VisitorObject {
  return {
    ImportExpression(node): void {
      append(literalSpecifier(node.source));
    },
    TSImportType(node): void {
      append(node.source.value, qualifierName(node.qualifier));
    },
    CallExpression(node): void {
      append(requireSpecifier(node));
    },
  };
}

function requireSpecifier(node: CallExpression): string | undefined {
  if (node.callee.type !== 'Identifier') return;
  return node.callee.name === 'require'
    ? literalSpecifier(node.arguments[0])
    : undefined;
}

function importCollector(
  imports: ImportEdge[],
  resolve: BoundResolver,
): AppendImport {
  return (specifier, name = '*'): void => {
    if (specifier)
      imports.push({
        specifier,
        target: resolve(specifier),
        names: [{ imported: name, local: name }],
        typeOnly: false,
        reExport: false,
      });
  };
}

export function expressionImports(
  program: Program,
  resolve: BoundResolver,
): ImportEdge[] {
  const imports: ImportEdge[] = [];
  new Visitor(importVisitor(importCollector(imports, resolve))).visit(program);
  return imports;
}
