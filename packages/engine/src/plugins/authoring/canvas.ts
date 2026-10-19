import { Visitor, type Program, type JSXElement } from 'oxc-parser';
import { visualName } from './visual-imports';

type Ancestry = {
  depth: number;
  names: Map<string, string>;
  children: Set<JSXElement>;
};

export function canvasChildren(
  program: Program,
  names: Map<string, string>,
): Set<JSXElement> {
  const context: Ancestry = { depth: 0, names, children: new Set() };
  new Visitor({
    JSXElement: (node): void => enter(context, node),
    'JSXElement:exit': (node): void => exit(context, node),
  }).visit(program);

  return context.children;
}

function enter(context: Ancestry, node: JSXElement): void {
  if (context.depth) context.children.add(node);

  if (visualName(node.openingElement, context.names) === 'Canvas')
    context.depth += 1;
}

function exit(context: Ancestry, node: JSXElement): void {
  if (visualName(node.openingElement, context.names) === 'Canvas')
    context.depth -= 1;
}
