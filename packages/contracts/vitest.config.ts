import { nodeTest } from '@repo/vitest/node';
import { defineProject } from 'vitest/config';

export default defineProject({ test: { ...nodeTest } });
