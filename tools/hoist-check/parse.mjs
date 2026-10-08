import fs from 'node:fs';
import { declarationNames, parseClause } from './clauses.mjs';
import { tokens, unquote } from './tokens.mjs';

function clauseEnd(source, position) {
  const stop = source
    .slice(position)
    .findIndex((token) => ['from', ';', 'import', 'export'].includes(token));
  return stop < 0 ? source.length : position + stop;
}

function directImport(source, position) {
  const next = source[position + 1];
  return (
    unquote(next) ?? (next === '(' ? unquote(source[position + 2]) : undefined)
  );
}

function importEdge(source, position, resolver) {
  const end = clauseEnd(source, position + 1);
  const specifier =
    directImport(source, position) ?? fromSpecifier(source, end);
  if (!specifier) return;
  const clause = source.slice(position + 1, end);
  return {
    specifier,
    target: resolver(specifier),
    names: importedNames(source, position, clause),
    typeOnly: clause[0] === 'type',
    reExport: source[position] === 'export',
  };
}

function declarations(source, position) {
  const clause = source.slice(position + 1);
  if (clause[0] !== '{') return declarationNames(clause);
  const close = clause.indexOf('}');
  return clause[close + 1] === 'from'
    ? []
    : declarationNames(clause.slice(0, close + 1));
}

function collectToken(context, position) {
  const keyword = context.source[position];
  if (['import', 'export', 'require'].includes(keyword)) {
    const edge = importEdge(context.source, position, context.resolve);
    appendEdge(context, edge);
  }
  if (keyword === 'export')
    declarations(context.source, position).map((name) =>
      context.declared.add(name),
    );
}

export function parseModule(file, resolver) {
  const source = [...tokens(fs.readFileSync(file, 'utf8'))];
  const context = {
    source,
    ...emptyModule(),
    resolve: (specifier) => resolver(specifier, file),
  };
  source.map((_, position) => collectToken(context, position));
  return {
    file,
    imports: context.imports,
    reExports: reExports(context),
    declared: context.declared,
  };
}

function fromSpecifier(source, end) {
  return source[end] === 'from' ? unquote(source[end + 1]) : undefined;
}

function appendEdge(context, edge) {
  if (edge) context.imports.push(edge);
}

function reExports(context) {
  return context.imports.filter((edge) => edge.reExport);
}

function emptyModule() {
  return { imports: [], declared: new Set() };
}

function importedNames(source, position, clause) {
  return directImport(source, position)
    ? directBinding(source, position)
    : parseClause(clause);
}

function directBinding(source, position) {
  const member = source[position + 4] === '.' ? source[position + 5] : '*';
  return [{ imported: member, local: member }];
}
