import type { PluginTest } from './host';

export type PluginTestCase = {
  name: string;
  run: (kit: PluginTest) => Promise<void> | void;
};

let collecting: PluginTestCase[] | null = null;

export function test(name: string, run: PluginTestCase['run']): void {
  if (!collecting)
    throw new Error('Run Plugin tests with argo plugin test <dir>');
  collecting.push({ name, run });
}

export function collectPluginTests(register: () => void): PluginTestCase[] {
  const cases: PluginTestCase[] = [];
  collecting = cases;

  try {
    register();

    return cases;
  } finally {
    collecting = null;
  }
}
