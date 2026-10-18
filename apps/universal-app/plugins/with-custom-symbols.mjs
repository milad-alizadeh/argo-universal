import fs from 'node:fs';
import path from 'node:path';
import customSymbols from '@repo/client/custom-symbol-paths.json' with { type: 'json' };
import tablerSymbols from '@repo/client/tabler-symbol-paths.json' with { type: 'json' };
import configPlugins from 'expo/config-plugins.js';

/*
 * Guides from Apple's SF Symbols template v3.0. The glyph is drawn Regular at every scale: Xcode finds no variant
 * for a scale the template leaves out, and a List's Label draws its icon at the large scale (ADR-0019).
 */
const baselines = { S: 696, M: 1126, L: 1556 };

// The system `circle` symbol's width at 100 points in each scale, which sizes each scale against the medium one.
const circleWidths = { S: 93, M: 117, L: 151 };

const scales = Object.fromEntries(
  Object.entries(circleWidths).map(([size, width]) => [
    size,
    width / circleWidths.M,
  ]),
);

const capHeight = 70.459;

const glyphCentre = 1650;

const marginAbove = 95.215;

const marginBelow = 24.121;

const guideStyle = 'fill:none;stroke:#27AAE1;stroke-width:0.5;';

function horizontalGuide(id, y) {
  return `  <line id="${id}" style="${guideStyle}" x1="263.75" x2="3036.25" y1="${y}" y2="${y}"/>`;
}

function marginGuide(id, x, size) {
  const top = baselines[size] - marginAbove;
  const bottom = baselines[size] + marginBelow;

  return `  <line id="${id}" style="${guideStyle}" x1="${x}" x2="${x}" y1="${top}" y2="${bottom}"/>`;
}

function marginGuides(half, size) {
  const scaled = half * scales[size];

  return [
    marginGuide(`left-margin-Regular-${size}`, glyphCentre - scaled, size),
    marginGuide(`right-margin-Regular-${size}`, glyphCentre + scaled, size),
  ];
}

function guides(viewBox) {
  const half = Number(viewBox.split(' ')[2]) / 2;

  return [
    ...Object.entries(baselines).flatMap(([size, y]) => [
      horizontalGuide(`Baseline-${size}`, y),
      horizontalGuide(`Capline-${size}`, y - capHeight),
    ]),
    ...Object.keys(scales).flatMap((size) => marginGuides(half, size)),
  ];
}

function glyph(size, d) {
  const scale = scales[size];
  const transform = `matrix(${scale} 0 0 ${scale} ${glyphCentre} ${baselines[size]})`;

  return `<g id="Regular-${size}" transform="${transform}"><path d="${d}"/></g>`;
}

function template({ viewBox, d }) {
  const version = 'Template v.3.0';
  const glyphs = Object.keys(scales).map((size) => glyph(size, d));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="3300" height="2200">',
    ` <g id="Notes"><text id="template-version" x="3036" y="1933">${version}</text></g>`,
    ' <g id="Guides">',
    ...guides(viewBox),
    ' </g>',
    ` <g id="Symbols">${glyphs.join('')}</g>`,
    '</svg>',
    '',
  ].join('\n');
}

function writeSymbolSet(catalog, name, symbol) {
  const folder = path.join(catalog, `${name}.symbolset`);
  const filename = `${name}.svg`;

  const contents = {
    info: { author: 'xcode', version: 1 },
    symbols: [{ filename, idiom: 'universal' }],
  };

  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, filename), template(symbol));
  fs.writeFileSync(
    path.join(folder, 'Contents.json'),
    `${JSON.stringify(contents, null, 2)}\n`,
  );
}

/*
 * Tabler icons only the web and desktop draw: a grouped row's disclosure, where iOS draws the system
 * chevron.forward (ADR-0019), so the catalog leaves them out.
 */
const webOnlyTablerSymbols = new Set(['custom.chevron-right']);

const appleSymbols = () => ({
  ...customSymbols,
  ...Object.fromEntries(
    Object.entries(tablerSymbols).filter(
      ([name]) => !webOnlyTablerSymbols.has(name),
    ),
  ),
});

function writeSymbolSets(modConfig) {
  const { platformProjectRoot, projectName } = modConfig.modRequest;

  const catalog = path.join(
    platformProjectRoot,
    projectName,
    'Images.xcassets',
  );

  for (const [name, symbol] of Object.entries(appleSymbols())) {
    writeSymbolSet(catalog, name, symbol);
  }

  return modConfig;
}

// Writes Argo's custom symbols and the Tabler git icons as symbol sets in the app's asset catalog, where the patched SymbolView finds them.
export default function withCustomSymbols(config) {
  return configPlugins.withDangerousMod(config, ['ios', writeSymbolSets]);
}
