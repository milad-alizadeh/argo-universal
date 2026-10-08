import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createGenerator, type Definition } from 'ts-json-schema-generator';
import { codexProtocolVersion } from './protocol.gen.ts';

const roots = [
  'InitializeResponse',
  'GetAccountResponse',
  'ModelListResponse',
  'ThreadStartResponse',
  'ThreadResumeResponse',
  'TurnStartResponse',
  'TurnInterruptResponse',
  'VendorRequest',
  'VendorMessage',
  'ThreadResumeParams',
  'TurnInterruptParams',
  'TurnStartParams',
  'ToolRequestUserInputResponse',
  'CommandExecutionRequestApprovalResponse',
  'FileChangeRequestApprovalResponse',
];
const generator = createGenerator({
  path: `${import.meta.dirname}/{messages,protocol.gen}.ts`,
  type: '*',
  additionalProperties: true,
  jsDoc: 'none',
  skipTypeCheck: true,
});
const definitions = Object.assign(
  {},
  ...roots.map(
    (root): ReturnType<typeof generator.createSchema>['definitions'] =>
      generator.createSchema(root).definitions,
  ),
);
const sourceHash = createHash('sha256')
  .update(readFileSync(new URL('./protocol.gen.ts', import.meta.url)))
  .digest('hex');
writeFileSync(
  new URL('./protocol-schemas.gen.json', import.meta.url),
  JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $comment: `Generated from codex-cli ${codexProtocolVersion}; ts-json-schema-generator 2.9.0; protocol SHA256 ${sourceHash}.`,
      definitions,
    },
    null,
    2,
  ) + '\n',
);

function methodNames(root: string): string[] {
  const schema = generator.createSchema(root);
  const definition = requireDefinition(schema.definitions ?? {}, root);
  return (definition.anyOf ?? []).flatMap(methodName).sort();
}
function requireDefinition(
  definitions: NonNullable<
    ReturnType<typeof generator.createSchema>['definitions']
  >,
  root: string,
): Definition {
  const definition = definitions[root];
  if (!definition) throw new Error(`Missing schema: ${root}`);
  if (typeof definition === 'boolean')
    throw new Error(`Boolean schema: ${root}`);
  return definition;
}
function methodName(
  variant: NonNullable<Definition['anyOf']>[number],
): string[] {
  if (typeof variant === 'boolean') return [];
  return methodConstant(variant.properties?.method);
}
function methodConstant(
  method: NonNullable<Definition['anyOf']>[number] | undefined,
): string[] {
  if (typeof method !== 'object') return [];
  if (typeof method.const !== 'string') return [];
  return [method.const];
}
writeFileSync(
  new URL('./notification-methods.gen.json', import.meta.url),
  JSON.stringify(
    {
      known: methodNames('ServerNotification'),
      handled: methodNames('VendorMessage'),
    },
    null,
    2,
  ) + '\n',
);
