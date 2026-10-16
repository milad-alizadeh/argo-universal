import { caffeinate } from '../src/engine/caffeinate.ts';

const release = caffeinate(process.pid);

process.on('message', () => release());
