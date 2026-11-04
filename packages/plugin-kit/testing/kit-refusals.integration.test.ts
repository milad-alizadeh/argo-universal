import { svgCharacterLimit } from '@repo/contracts/plugins/wire-limits';
import { expect, it } from 'vitest';
import { startKit } from '../mocks/kit-page-helpers';

// A Plugin whose one Loader page draws `element`.
const drawing = (element: string): string =>
  `export function register(argo) { argo.pages.define('/', { load: () => null, render: () => ${element} }); }`;

it.each([
  {
    name: 'element subset',
    xml: '<svg><script/></svg>',
    reason: 'element <script> refused',
  },
  {
    name: 'raw color',
    xml: '<svg><path fill="#ffffff"/></svg>',
    reason: 'color #ffffff refused',
  },
  {
    name: 'character cap',
    xml: `<svg>${' '.repeat(svgCharacterLimit)}</svg>`,
    reason: 'character cap exceeded',
  },
])(
  'a draw drops and logs the refused Svg node: $name',
  async ({ xml, reason }) => {
    const svg = `<Svg label="Art" xml={${JSON.stringify(xml)}} />`;

    const kit = await startKit(
      `import { Svg } from '@argo/plugin-kit';\n${drawing(svg)}`,
    );

    const page = await kit.pages.open({ path: '/' });

    expect(page.tree.children).toEqual([]);
    expect(await kit.log()).toContain(`node Svg#0: ${reason}`);
  },
  30_000,
);

it.each([
  [
    'Chart',
    '<Chart label="Data" kind="bar" series={[{ name: "Files", tone: "#fff", points: [] }]} />',
    'tone',
  ],
  [
    'Canvas',
    '<Canvas label="Map" width={10} height={10} camera="fixed"><Image key="image" /></Canvas>',
    'shape Canvas.Image refused',
  ],
  [
    'Canvas',
    '<Canvas label="Map" width={10} height={10} camera="fixed"><Rect key="rect" tone="accent" width={1} height={1} fill="#fff" /></Canvas>',
    'fill',
  ],
  ['CodeMap', '<CodeMap />', 'unsupported CodeMap'],
])(
  'a draw drops and logs invalid %s data through the real Plugin host',
  async (type, element, reason) => {
    const kit = await startKit(
      `const Chart='Chart', Canvas='Canvas', Image='Canvas.Image', Rect='Canvas.Rect', CodeMap='CodeMap';
    ${drawing(element)}`,
    );

    const page = await kit.pages.open({ path: '/' });
    const log = await kit.log();

    expect(page.tree.children).toEqual([]);
    expect(log).toContain(`node ${type}#`);
    expect(log).toContain(reason);
  },
  30_000,
);
