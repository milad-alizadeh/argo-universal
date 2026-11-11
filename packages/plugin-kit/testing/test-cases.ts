import type { FixtureAnswer, FixtureRequest } from './fixture-services';
import type { PluginTest } from './host';

// Plays the public services the Plugin reaches, such as api.github.com, answering each request it makes.
export type TestServices = (
  request: FixtureRequest,
) => FixtureAnswer | Promise<FixtureAnswer>;

export type PluginTestCase = {
  name: string;
  // The requests the Plugin made to the services, as they come; none when the test names no services.
  run: (kit: PluginTest, requests: FixtureRequest[]) => Promise<void> | void;
  services?: TestServices;
};

let collecting: PluginTestCase[] | null = null;

export function test(
  name: string,
  run: PluginTestCase['run'],
  options: Pick<PluginTestCase, 'services'> = {},
): void {
  if (!collecting)
    throw new Error('Run Plugin tests with argo plugin test <dir>');
  collecting.push({ name, run, ...options });
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
