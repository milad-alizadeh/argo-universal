#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { launch } from '@argo/plugin-kit/launch';

launch(fileURLToPath(new URL('../src/main.ts', import.meta.url)));
