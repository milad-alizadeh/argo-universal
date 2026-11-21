import { accountFetch, SignInRequired, type Argo } from '@argo/plugin-kit';
import {
  applicationKeyHeader,
  applicationKeySecret,
  hueHost,
  resourcesUrl,
  resourceUrlOf,
  type HueResource,
} from './hue';
import type { HomeData, Household, Switch, Switchable } from './hue-model';
import { householdOf } from './hue-readers';
import { at, jsonRequest, list, parseJson, text, type Json } from './json';

/*
 * The CLIP API v2 through Hue's cloud, as the person signed in: the kit borrows the Account, which lends its Bearer
 * token, and the Bridge's application key goes beside it. A missing Account throws `SignInRequired`, which the page's
 * gate answers with the sign-in.
 */
export type HueCalls = Pick<Argo, 'fetch' | 'secrets' | 'accounts'>;

type FetchResponse = Awaited<ReturnType<ReturnType<typeof accountFetch>>>;

// One CLIP v2 reply: its data, a key the Bridge no longer knows, or why Hue said no.
type Read =
  | { kind: 'data'; data: readonly Json[] }
  | { kind: 'refused' }
  | { kind: 'failed'; reason: string; status: number };

const forbidden = 403;

const notFound = 404;

type KeyHeader = { [applicationKeyHeader]: string };

const keyed = (key: string): KeyHeader => ({ [applicationKeyHeader]: key });

// CLIP v2 answers `{ errors, data }`; its first error says why when the reply is not OK.
const hueError = (reply: FetchResponse, body: Json | undefined): string =>
  text(at(list(at(body, 'errors'))[0], 'description')) ??
  `Hue answered ${reply.status}`;

function readOf(reply: FetchResponse, body: Json | undefined): Read {
  if (reply.status === forbidden) return { kind: 'refused' };

  const errors = at(body, 'errors');
  const data = at(body, 'data');

  if (!reply.ok || list(errors).length > 0)
    return {
      kind: 'failed',
      reason: hueError(reply, body),
      status: reply.status,
    };

  return Array.isArray(data) && Array.isArray(errors)
    ? { kind: 'data', data }
    : {
        kind: 'failed',
        reason: 'Hue returned an unexpected reply.',
        status: reply.status,
      };
}

const answerOf = async (reply: FetchResponse): Promise<Read> =>
  readOf(reply, parseJson(await reply.text()));

const resources = async (
  argo: HueCalls,
  { kind, key }: { kind: HueResource; key: string },
): Promise<Read> =>
  answerOf(
    await accountFetch(argo, hueHost)(resourcesUrl(kind), {
      headers: keyed(key),
    }),
  );

const dataIn = (read: Read): readonly Json[] =>
  read.kind === 'data' ? read.data : [];

type Reads = Readonly<{
  lights: Read;
  rooms: Read;
  groups: Read;
  scenes: Read;
  connectivity: Read;
}>;

type Problem = Exclude<Read, { kind: 'data' }>;

const isProblem = (read: Read): read is Problem => read.kind !== 'data';

const homeOf = (reads: Reads): HomeData => ({
  kind: 'home',
  household: householdOf({
    lights: dataIn(reads.lights),
    rooms: dataIn(reads.rooms),
    groups: dataIn(reads.groups),
    scenes: dataIn(reads.scenes),
    connectivity: dataIn(reads.connectivity),
  }),
});

function settled(reads: Reads): HomeData {
  const problem = Object.values(reads).find(isProblem);

  if (!problem) return homeOf(reads);

  return problem.kind === 'failed' ? problem : { kind: 'connect' };
}

async function household(argo: HueCalls, key: string): Promise<HomeData> {
  const read = (kind: HueResource): Promise<Read> =>
    resources(argo, { kind, key });

  const [lights, rooms, groups, scenes, connectivity] = await Promise.all([
    read('light'),
    read('room'),
    read('grouped_light'),
    read('scene'),
    read('zigbee_connectivity'),
  ]);

  return settled({ lights, rooms, groups, scenes, connectivity });
}

// The Home page's one read; signed out, the gate draws the sign-in before the Bridge is asked for.
export async function homeData(argo: HueCalls): Promise<HomeData> {
  if (!(await argo.accounts.get(hueHost))) throw new SignInRequired();

  const key = await argo.secrets.get(applicationKeySecret);

  return key ? household(argo, key) : { kind: 'connect' };
}

const reconnect = 'Hue no longer knows this Bridge’s key: connect it again.';

const reasonOf = (read: Read): string =>
  read.kind === 'failed' ? read.reason : reconnect;

// Without a key the Bridge must be connected again, so no call goes out with an empty one.
async function keyOf(argo: HueCalls): Promise<string> {
  const key = await argo.secrets.get(applicationKeySecret);

  if (!key) throw new Error(reconnect);

  return key;
}

// What a PUT may change: a light, a room's grouped light, or a scene to recall.
type Writable = Switchable | 'scene';

// Switches, dims or colours one light or a room's grouped light, or recalls a scene, then has the page read again.
export async function change(
  argo: HueCalls,
  target: { kind: Writable; id: string; body: Json },
): Promise<void> {
  const key = await keyOf(argo);

  const read = await answerOf(
    await accountFetch(argo, hueHost)(
      resourceUrlOf(target.kind, target.id),
      jsonRequest('PUT', target.body, keyed(key)),
    ),
  );

  if (
    read.kind === 'failed' &&
    read.status === notFound &&
    target.kind === 'scene'
  )
    throw new Error(`Scene "${target.id}" no longer exists in a Hue room.`);

  if (read.kind !== 'data') throw new Error(reasonOf(read));
}

// Every light with its colour and reachability, without the rooms, for a write that checks one before it sends.
export async function lightsRead(argo: HueCalls): Promise<readonly Switch[]> {
  const key = await keyOf(argo);

  const [lights, connectivity] = await Promise.all([
    resources(argo, { kind: 'light', key }),
    resources(argo, { kind: 'zigbee_connectivity', key }),
  ]);

  const problem = [lights, connectivity].find(isProblem);

  if (problem) throw new Error(reasonOf(problem));

  return householdOf({
    lights: dataIn(lights),
    rooms: [],
    groups: [],
    scenes: [],
    connectivity: dataIn(connectivity),
  }).others;
}

// The household as it is now, or why it cannot be read: a read an Agent's list Operation answers from.
export function householdRead(data: HomeData): Household {
  if (data.kind === 'home') return data.household;

  throw new Error(data.kind === 'failed' ? data.reason : reconnect);
}
