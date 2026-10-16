import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'rolldown';
import { parseSync, type ESTree } from 'rolldown/utils';

const source = fileURLToPath(
  new URL(
    '../../client/src/lib/generic/symbols/icon-names.ts',
    import.meta.url,
  ),
);

const destination = fileURLToPath(
  new URL('../src/icons.gen.ts', import.meta.url),
);

// Bundle the map's data imports, then read its keys without executing any module.
async function iconNames(): Promise<string[]> {
  const bundle = await build({
    input: source,
    platform: 'node',
    write: false,
    output: { format: 'esm' },
  });

  const declarations = parseSync('icons.js', bundle.output[0].code)
    .program.body.filter(
      (statement) => statement.type === 'VariableDeclaration',
    )
    .flatMap((statement) => statement.declarations);

  return declaredNames('iconSymbols', declarations).sort();
}

function declaredNames(
  name: string,
  declarations: ESTree.VariableDeclarator[],
): string[] {
  const declaration = declarations.find(
    (value) => value.id.type === 'Identifier' && value.id.name === name,
  );

  return objectProperties(declaration?.init).flatMap((property) =>
    memberNames(property, declarations),
  );
}

function objectProperties(
  expression: ESTree.Expression | null | undefined,
): ESTree.ObjectExpression['properties'] {
  if (expression?.type !== 'ObjectExpression')
    throw new Error('Icon maps must be object literals');

  return expression.properties;
}

function memberNames(
  property: ESTree.ObjectExpression['properties'][number],
  declarations: ESTree.VariableDeclarator[],
): string[] {
  if (property.type === 'SpreadElement')
    return declaredNames(identifierName(property.argument), declarations);

  return [propertyKey(property.key)];
}

function identifierName(expression: ESTree.Expression): string {
  if (expression.type !== 'Identifier')
    throw new Error('Icon spreads must name a map');

  return expression.name;
}

function propertyKey(key: ESTree.PropertyKey): string {
  if (key.type === 'Identifier') return key.name;

  if (key.type === 'Literal') return literalKey(key);

  throw new Error('Icon keys must be names or strings');
}

function literalKey(
  key: Extract<ESTree.PropertyKey, { type: 'Literal' }>,
): string {
  if (typeof key.value !== 'string')
    throw new Error('Icon keys must be strings');

  return key.value;
}

const names = (await iconNames()).map((name) => `  '${name}',`).join('\n');

const content = `// Generated from the canonical iconSymbols map by tools/icons.mts.\nimport { z } from 'zod';\n\nexport const IconName = z.enum([\n${names}\n]);\n\nexport type IconName = z.infer<typeof IconName>;\n`;

if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== content)
    throw new Error(
      'Plugin icon names are stale. Run pnpm --filter @repo/contracts generate:icons.',
    );
} else writeFileSync(destination, content);
