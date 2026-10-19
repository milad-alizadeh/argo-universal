import { expect, it } from 'vitest';
import { fixture, run } from '../mocks/plugin-cli';

const oversizedSvg = JSON.stringify('<svg>' + ' '.repeat(131_072) + '</svg>');

it.each([
  ['Svg', 'label="Art" xml="<svg><script/></svg>"', 'element <script> refused'],
  [
    'Svg',
    `label="Art" xml='<svg><path fill="#ffffff"/></svg>'`,
    'color #ffffff refused',
  ],
  ['Svg', `label="Art" xml={${oversizedSvg}}`, 'character cap exceeded'],
  [
    'Chart',
    'label="Data" series={[{name:"Files",tone:"#fff",points:[]}]}',
    'tone',
  ],
  [
    'Chart',
    `series={${JSON.stringify(Array.from({ length: 9 }, () => ({ name: 'Files', tone: 'accent', points: [] })))}}`,
    'series',
  ],
  ['Canvas', 'label="Map" width={1e999}', 'width'],
  ['Canvas.Rect', 'tone="accent"', 'only valid inside Canvas'],
  ['CodeMap', '', 'unsupported CodeMap'],
])(
  'validate refuses invalid %s',
  async (type, props, reason) => {
    const imported = type.split('.')[0];

    const directory =
      await fixture(`import { ${imported} } from '@argo/plugin-kit';
    export function register(argo) { argo.pages.register('/', () => <${type} ${props} />); }
  `);

    const result = await run('validate', directory);
    expect(result.code).toBe(1);
    expect(result.output).toContain(`${type} node:`);
    expect(result.output).toContain(reason);
    expect(result.output).toContain('index.tsx:2:');
  },
  30_000,
);

it('validate checks shapes within an aliased Canvas', async () => {
  const directory =
    await fixture(`import { Canvas as Scene } from '@argo/plugin-kit';
    export function register(argo) { argo.pages.register('/', () => <Scene label="Map" width={10} height={10} camera="fixed"><Scene.Image key="image" /></Scene>); }
  `);

  expect(await run('validate', directory)).toMatchObject({
    code: 1,
    output: expect.stringContaining('shape Canvas.Image refused'),
  });
}, 30_000);
