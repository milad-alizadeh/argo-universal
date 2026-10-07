import { defineProject } from 'vitest/config';
import { nodeTest } from './node.ts';

export default defineProject({
  test: { ...nodeTest },
});
