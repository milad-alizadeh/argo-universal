/*
 * Manual evidence collector, not a production test seam.
 * Run sequentially with one browser or App at a time.
 */
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { browser } from './measure-launch.mjs';
import { options, scenarios } from './measure-options.mjs';
import { run } from './measure-scenario.mjs';

const gibibyte = 1073741824;

function write(settings, results) {
  const machine = {
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus()[0]?.model,
    memoryGiB: os.totalmem() / gibibyte,
  };

  writeFileSync(
    join(settings.directory, `${settings.mode}.json`),
    JSON.stringify({ machine, results }, null, 2),
  );
  console.log(JSON.stringify(results.at(-1)));
}

async function collect(settings) {
  const web = await browser(settings);
  const results = [];

  try {
    for (const scenario of scenarios(settings)) {
      results.push(await run(settings, scenario, web));
      write(settings, results);
    }
  } finally {
    await web?.close();
  }
}

await collect(options());
