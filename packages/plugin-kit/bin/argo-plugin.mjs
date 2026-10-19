#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { launch } from './launch.mjs';

launch(fileURLToPath(new URL('../cli/main.ts', import.meta.url)));
