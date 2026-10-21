import { WireNode } from '@repo/contracts/plugins/wire';
import { slottedRow } from '@repo/contracts/plugins/wire-fixtures';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import canvasFixture from '@repo/mocks/plugins/canvas.json' with { type: 'json' };
import controlFixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import overlaysFixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import svgFixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { PluginTreeProps } from './plugin-registry';

// A story supplies the event spy; a fixture is the wire tree a Plugin sent.
type PluginTreeFixture = Omit<PluginTreeProps, 'onEvent'>;

// Each control fixture is one node in the shared mocks, keyed by the part it draws.
function controlTree(key: string): WireNode {
  const fixture = controlFixtures.find((control) => control.key === key);

  if (!fixture) throw new Error(`Missing ${key} control fixture`);

  return WireNode.parse(fixture);
}

const control = (key: string): PluginTreeFixture => ({
  root: controlTree(key),
});

// The shared SVG mocks are keyed by name, so a fixture names the drawing it wants.
function validSvgXml(name: string): string {
  const fixture = svgFixtures.valid.find((svg) => svg.name === name);

  if (!fixture) throw new Error(`Missing ${name} SVG fixture`);

  return fixture.xml;
}

const svgRoot = (): WireNode => ({
  type: 'Svg',
  key: '0',
  props: {
    xml: validSvgXml('gradient with local references'),
    label: 'Service map',
    tone: 'info',
    onPress: { $event: 'onPress' },
  },
  children: [],
  slots: {},
});

// A row whose trailing slot holds nodes of its own, which the tree draws into the part's lane.
export const slottedRowTree = { root: slottedRow } satisfies PluginTreeFixture;

export const svgTree = { root: svgRoot() } satisfies PluginTreeFixture;

export const canvasTree = {
  root: WireNode.parse(canvasFixture),
} satisfies PluginTreeFixture;

// Overlays are ordinary nodes in the tree, so the sheet is opened by patching its own props.
export const openSheetTree = {
  root: applyPatch(WireNode.parse(overlaysFixture), [
    { op: 'setProps', key: ['sheet'], props: { open: true } },
  ]),
} satisfies PluginTreeFixture;

export const switchTree = control('switch');

export const checkboxTree = control('checkbox');

export const pickerTree = control('picker');

export const sliderTree = control('slider');

export const textInputTree = control('textinput');

export const iconButtonTree = control('iconbutton');

export const splitButtonTree = control('splitbutton');
