import { parseArgs } from 'node:util';
import { startSupervisor } from './supervisor';

// `--watch` restarts the Engine on a file change (the dev script).
const { values } = parseArgs({
  options: { watch: { type: 'boolean', default: false } },
});

startSupervisor({ watch: values.watch });
