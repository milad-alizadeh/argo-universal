import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import { cloudAnswer, type HueCloud } from './hue-cloud';
import { clipAnswer } from './hue-clip';
import { household, type HueHousehold } from './hue-data';

/*
 * Hue's Remote API as the Plugin meets it, for its tests: OAuth, the virtual link button, and CLIP v2 over the
 * cloud, at their real names over a certificate the test trusts. A test changes `home` to change the house, or
 * makes every CLIP call fail with `fail(answer)` until `heal()`.
 */
export type HueService = Pick<FixtureServices, 'network' | 'requests'> & {
  home: HueHousehold;
  cloud: HueCloud;
  fail: (answer: FixtureAnswer) => void;
  heal: () => void;
  // The PUTs that changed a light or a room, with their bodies parsed.
  puts: () => { path: string; body: unknown; key: unknown }[];
};

type Held = { home: HueHousehold; cloud: HueCloud; failing: FixtureAnswer | null };

const missing: FixtureAnswer = { status: 404, text: 'Not found' };

const isClip = (request: FixtureRequest): boolean =>
  request.path.startsWith('/route/clip/');

const failingFor = (held: Held, request: FixtureRequest): FixtureAnswer | null =>
  isClip(request) ? held.failing : null;

const serviceAnswer = (held: Held, request: FixtureRequest): FixtureAnswer =>
  cloudAnswer(held.cloud, request) ?? clipAnswer(held.home, request) ?? missing;

const answered = (held: Held, request: FixtureRequest): FixtureAnswer =>
  failingFor(held, request) ?? serviceAnswer(held, request);

const isPut = (request: FixtureRequest): boolean =>
  request.method === 'PUT' && isClip(request);

const putsIn = (requests: FixtureRequest[]): ReturnType<HueService['puts']> =>
  requests.flatMap((request) =>
    isPut(request)
      ? [
          {
            path: request.path,
            body: JSON.parse(request.body),
            key: request.headers['hue-application-key'],
          },
        ]
      : [],
  );

const freshHeld = (): Held => ({
  home: household(),
  cloud: { forms: [], linkPressed: false },
  failing: null,
});

export async function hueService(): Promise<HueService> {
  const held = freshHeld();
  const services = await fixtureServices((request) => answered(held, request));

  return {
    ...services,
    home: held.home,
    cloud: held.cloud,
    fail: (answer) => (held.failing = answer),
    heal: () => (held.failing = null),
    puts: () => putsIn(services.requests),
  };
}
