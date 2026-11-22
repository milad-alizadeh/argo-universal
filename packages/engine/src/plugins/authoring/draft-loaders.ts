import type { PluginManifest } from '@repo/contracts/plugins';
import { draftPages } from '@repo/contracts/plugins/drafts';
import {
  parseSync,
  Visitor,
  type CallExpression,
  type Expression,
  type ObjectExpression,
  type Function as AstFunction,
  type Program,
} from 'oxc-parser';
import { canonicalCall, registrationNames } from './bindings';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './diagnostics';
import { firstString, memberPath } from './expressions';

/*
 * A Draft Loader answers canned data, so it makes no `argo` call and reads no Query, in a Plugin that holds
 * Capabilities too (ADR-0057). The check is static, as the rest of `validate` is.
 */

type FieldValue = Extract<
  Extract<
    ObjectExpression['properties'][number],
    { type: 'Property' }
  >['value'],
  { type: string }
>;

type Range = { start: number; end: number };

type Param = AstFunction['params'][number];

type Callable = Range & { params: Param[] };

type Call = {
  start: number;
  callee: string;
  canonical: string;
  args: (string | undefined)[];
};

// What a Loader's own input is called, and the names its `read` goes by.
type Names = { inputs: Set<string>; reads: Set<string> };

type Queued = Scope & { names: Names };

export function inspectDraftLoaders(
  input: SourceFile,
  manifest: PluginManifest,
): PluginDiagnostic[] {
  const pages = new Set(draftPages(manifest.contributes.drafts).map(({ page }) => page));

  if (!pages.size) return [];

  const program = parseSync(input.file, input.source, {
    lang: input.file.endsWith('.ts') ? 'ts' : 'tsx',
  }).program;

  return refusals(input, collect(program, pages));
}

// Each Loader's calls, then the calls of the same-file helpers it reaches, each once.
function refusals(input: SourceFile, found: Found): PluginDiagnostic[] {
  const diagnostics: PluginDiagnostic[] = [];
  const done = new Set<number>();
  const queue = loaderQueue(found);

  for (const scope of queue) {
    if (done.has(scope.start)) continue;
    done.add(scope.start);

    const inspected = inspectScope(input, found, scope);

    diagnostics.push(...inspected.diagnostics);
    queue.push(...inspected.helpers);
  }

  return diagnostics;
}

type Inspected = { diagnostics: PluginDiagnostic[]; helpers: Queued[] };

function inspectScope(
  input: SourceFile,
  found: Found,
  scope: Queued,
): Inspected {
  const calls = callsIn(found, scope);

  return {
    diagnostics: calls.flatMap((call) => {
      const refused = refusal(call, scope.names);

      return refused ? [refusalDiagnostic(input, [scope, call], refused)] : [];
    }),
    helpers: calls.flatMap((call) => helperScope(found, scope, call)),
  };
}

const loaderQueue = (found: Found): Queued[] =>
  found.loaders.map((loader) => ({
    ...loader,
    names: namesOf(loader.params, []),
  }));

const callsIn = (found: Found, scope: Range): Call[] =>
  found.calls.filter(({ start }) => start >= scope.start && start < scope.end);

function refusalDiagnostic(
  input: SourceFile,
  [scope, call]: [Scope, Call],
  refused: string,
): PluginDiagnostic {
  return sourceDiagnostic(
    input,
    call.start,
    `Draft Loader of ${scope.page} calls ${refused}; a Draft answers canned data and calls stubs only`,
  );
}

function helperScope(found: Found, scope: Queued, call: Call): Queued[] {
  const helper = found.functions.get(call.callee);

  return helper
    ? [
        {
          ...helper,
          page: scope.page,
          names: namesOf(helper.params, passed(call, scope.names)),
        },
      ]
    : [];
}

// The call's text when a Draft Loader may not make it: an `argo` call, or a read of the Loader's input.
function refusal(call: Call, names: Names): string | undefined {
  if (call.canonical.startsWith('argo.')) return call.canonical;
  const [owner, method] = call.callee.split('.');

  if (method === 'read' && owner && names.inputs.has(owner)) return call.callee;

  return names.reads.has(call.callee) ? call.callee : undefined;
}

// The positions of a call's arguments that hand the Loader's input or its `read` to a helper.
function passed(call: Call, names: Names): number[] {
  return call.args.flatMap((arg, index) =>
    arg && (names.inputs.has(arg) || names.reads.has(arg)) ? [index] : [],
  );
}

type Scope = Range & { page: string; params: Param[] };

type Found = {
  calls: Call[];
  functions: Map<string, Callable>;
  loaders: Scope[];
};

function collect(program: Program, pages: Set<string>): Found {
  const bindings = registrationNames(program);
  const found: Found = { calls: [], functions: new Map(), loaders: [] };
  const defined: { page: string; fields: Map<string, FieldValue> }[] = [];

  new Visitor({
    FunctionDeclaration: (node): void => {
      if (node.id) found.functions.set(node.id.name, callable(node));
    },
    VariableDeclarator: (node): void => {
      const init = node.init;

      if (node.id.type === 'Identifier' && init && isFunction(init))
        found.functions.set(node.id.name, callable(init));
    },
    CallExpression: (node): void => {
      const callee = memberPath(node.callee);

      found.calls.push({
        start: node.start,
        callee,
        canonical: canonicalCall(callee, bindings),
        args: node.arguments.map((arg) =>
          arg.type === 'Identifier' ? arg.name : undefined,
        ),
      });

      const page = definedPage(node, canonicalCall(callee, bindings), pages);

      if (page) defined.push(page);
    },
  }).visit(program);

  for (const { page, fields } of defined)
    for (const key of ['load', 'list']) {
      const scope = loaderScope(fields.get(key), found.functions);

      if (scope) found.loaders.push({ ...scope, page });
    }

  return found;
}

function definedPage(
  node: CallExpression,
  name: string,
  pages: Set<string>,
): { page: string; fields: Map<string, FieldValue> } | undefined {
  if (name !== 'argo.pages.define') return undefined;
  const page = firstString(node);
  const options = node.arguments.at(1);

  if (
    page === undefined ||
    !pages.has(page) ||
    options?.type !== 'ObjectExpression'
  )
    return undefined;
  const fields = new Map<string, FieldValue>();

  for (const property of options.properties)
    if (
      property.type === 'Property' &&
      property.key.type === 'Identifier' &&
      !property.computed
    )
      fields.set(property.key.name, property.value);

  return { page, fields };
}

function loaderScope(
  value: FieldValue | undefined,
  functions: Map<string, Callable>,
): Callable | undefined {
  if (!value) return undefined;

  if (isFunction(value)) return callable(value);

  return value.type === 'Identifier' ? functions.get(value.name) : undefined;
}

type FunctionNode = Extract<
  Expression,
  { type: 'ArrowFunctionExpression' | 'FunctionExpression' }
>;

const isFunction = (node: { type: string }): node is FunctionNode =>
  node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';

function callable(node: {
  start: number;
  end: number;
  params: Param[];
}): Callable {
  return { start: node.start, end: node.end, params: node.params };
}

/*
 * The names a function's parameters give the Loader's input and its `read`: the first parameter of a
 * Loader, and the parameters of a helper at the positions the Loader passed them to.
 */
function namesOf(params: Param[], positions: number[]): Names {
  const names: Names = { inputs: new Set(), reads: new Set() };

  for (const position of positions.length ? positions : [0]) {
    const param = params[position];

    if (param?.type === 'Identifier') {
      names.inputs.add(param.name);
      names.reads.add(param.name);
    }

    if (param?.type === 'ObjectPattern') addRead(names, param);
  }

  return names;
}

function addRead(
  names: Names,
  pattern: Extract<Param, { type: 'ObjectPattern' }>,
): void {
  for (const property of pattern.properties) {
    if (property.type !== 'Property' || property.key.type !== 'Identifier')
      continue;

    if (property.key.name === 'read' && property.value.type === 'Identifier')
      names.reads.add(property.value.name);
  }
}
