import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createGenerator } from 'ts-json-schema-generator';

const sdk = path.join(
  import.meta.dirname,
  '../node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts',
);
const sdkVersion: unknown = JSON.parse(
  readFileSync(path.join(path.dirname(sdk), 'package.json'), 'utf8'),
).version;
const generatorVersion: unknown = JSON.parse(
  readFileSync(
    new URL(
      '../node_modules/ts-json-schema-generator/package.json',
      import.meta.url,
    ),
    'utf8',
  ),
).version;
if (typeof sdkVersion !== 'string' || typeof generatorVersion !== 'string')
  throw new Error('Missing installed package version');

const roots = [
  'SDKMessage',
  'SDKControlRequest',
  'SDKControlResponse',
  'SDKControlInitializeResponse',
];
const definitions = Object.assign(
  {},
  ...roots.map(
    (type): object =>
      createGenerator({
        path: sdk,
        tsconfig: path.join(import.meta.dirname, '../tsconfig.json'),
        type,
        jsDoc: 'none',
        additionalProperties: true,
        skipTypeCheck: false,
      }).createSchema(type).definitions ?? {},
  ),
);
writeFileSync(
  new URL('./wire-schema.gen.json', import.meta.url),
  JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $comment: `Generated from @anthropic-ai/claude-agent-sdk ${sdkVersion} by ts-json-schema-generator ${generatorVersion}; run generate-wire-schema.ts.`,
      definitions,
    },
    null,
    2,
  ) + '\n',
);
