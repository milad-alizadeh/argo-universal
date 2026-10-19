import {
  Visitor,
  type Program,
  type Function as AstFunction,
  type VariableDeclarator,
} from 'oxc-parser';

export function registrationNames(program: Program): Set<string> {
  const names = new Set(['argo']);
  new Visitor({
    FunctionDeclaration: (node): void => record(names, node),
    VariableDeclarator: (node): void => recordVariable(names, node),
  }).visit(program);

  return names;
}

function record(names: Set<string>, node: AstFunction): void {
  if (node.id?.name !== 'register') return;
  firstParameter(names, node.params);
}

export function canonicalCall(name: string, bindings: Set<string>): string {
  const [binding, ...path] = name.split('.');

  return binding && bindings.has(binding) ? ['argo', ...path].join('.') : '';
}

function addParameter(
  names: Set<string>,
  parameter: AstFunction['params'][number],
): void {
  if (parameter.type === 'Identifier') names.add(parameter.name);
}

function firstParameter(
  names: Set<string>,
  parameters: AstFunction['params'],
): void {
  const parameter = parameters[0];

  if (parameter) addParameter(names, parameter);
}

function recordVariable(names: Set<string>, node: VariableDeclarator): void {
  if (node.id.type !== 'Identifier') return;

  if (node.id.name === 'register') recordInitializer(names, node.init);
}

function recordInitializer(
  names: Set<string>,
  node: VariableDeclarator['init'],
): void {
  if (!node) return;

  const parameters = functionParameters(node);

  if (parameters) firstParameter(names, parameters);
}

function functionParameters(
  node: NonNullable<VariableDeclarator['init']>,
): AstFunction['params'] | undefined {
  return node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression'
    ? node.params
    : undefined;
}
