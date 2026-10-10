import fs from 'node:fs';
import path from 'node:path';
import symbols from '@repo/client/custom-symbols.json' with { type: 'json' };
import configPlugins from 'expo/config-plugins.js';

/*
 * Guides from Apple's SF Symbols template v3.0. The glyph is the Regular-M variant, which Xcode scales to every
 * weight and size (ADR-0019).
 */
const baselines = { S: 696, M: 1126, L: 1556 };
const capHeight = 70.459;
const glyphCentre = 1650;
const marginAbove = 95.215;
const marginBelow = 24.121;
const guideStyle = 'fill:none;stroke:#27AAE1;stroke-width:0.5;';

function horizontalGuide(id, y) {
  return `  <line id="${id}" style="${guideStyle}" x1="263.75" x2="3036.25" y1="${y}" y2="${y}"/>`;
}

function marginGuide(id, x) {
  const top = baselines.M - marginAbove;
  const bottom = baselines.M + marginBelow;
  return `  <line id="${id}" style="${guideStyle}" x1="${x}" x2="${x}" y1="${top}" y2="${bottom}"/>`;
}

function guides(viewBox) {
  const half = Number(viewBox.split(' ')[2]) / 2;
  return [
    ...Object.entries(baselines).flatMap(([size, y]) => [
      horizontalGuide(`Baseline-${size}`, y),
      horizontalGuide(`Capline-${size}`, y - capHeight),
    ]),
    marginGuide('left-margin-Regular-M', glyphCentre - half),
    marginGuide('right-margin-Regular-M', glyphCentre + half),
  ];
}

function template({ viewBox, d }) {
  const version = 'Template v.3.0';
  const glyph = `matrix(1 0 0 1 ${glyphCentre} ${baselines.M})`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="3300" height="2200">',
    ` <g id="Notes"><text id="template-version" x="3036" y="1933">${version}</text></g>`,
    ' <g id="Guides">',
    ...guides(viewBox),
    ' </g>',
    ` <g id="Symbols"><g id="Regular-M" transform="${glyph}"><path d="${d}"/></g></g>`,
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

function writeSymbolSets(modConfig) {
  const { platformProjectRoot, projectName } = modConfig.modRequest;
  const catalog = path.join(
    platformProjectRoot,
    projectName,
    'Images.xcassets',
  );
  for (const [name, symbol] of Object.entries(symbols)) {
    writeSymbolSet(catalog, name, symbol);
  }
  return modConfig;
}

// Writes each custom symbol as a symbol set in the app's asset catalog, where the patched SymbolView finds it.
export default function withCustomSymbols(config) {
  return configPlugins.withDangerousMod(config, ['ios', writeSymbolSets]);
}
