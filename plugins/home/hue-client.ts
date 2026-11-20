import { accountFetch, SignInRequired, type Argo } from '@argo/plugin-kit';
import {
  applicationKeyHeader,
  applicationKeySecret,
  hueHost,
  resourcesUrl,
  resourceUrlOf,
  type HueResource,
} from './hue';
import type { HomeData, Switchable } from './hue-model';
import { householdOf } from './hue-readers';
import { at, jsonRequest, list, parseJson, text, type Json } from './json';

/*
 * The CLIP API v2 through Hue's cloud, as the person signed in: the kit borrows the Account, which lends its Bearer
 * token, and the Bridge's application key goes beside it. A missing Account throws `SignInRequired`, which the page's
 * gate answers with the sign-in.
 */
export type HueCalls = Pick<Argo, 'fetch' | 'secrets' | 'changed' | 'accounts'>;

type FetchResponse = Awaited<ReturnType<ReturnType<typeof accountFetch>>>;

// One CLIP v2 reply: its data, a key the Bridge no longer knows, or why Hue said no.
type Read =
  | { kind: 'data'; data: readonly Json[] }
  | { kind: 'refused' }
  | { kind: 'failed'; reason: string };

const forbidden = 403;

type KeyHeader = { [applicationKeyHeader]: string };

const keyed = (key: string): KeyHeader => ({ [applicationKeyHeader]: key });

// CLIP v2 answers `{ errors, data }`; its first error says why when the reply is not OK.
const hueError = (reply: FetchResponse, body: Json | undefined): string =>
  text(at(list(at(body, 'errors'))[0], 'description')) ??
  `Hue answered ${reply.status}`;

function readOf(reply: FetchResponse, body: Json | undefined): Read {
  if (reply.status === forbidden) return { kind: 'refused' };

  return reply.ok
    ? { kind: 'data', data: list(at(body, 'data')) }
    : { kind: 'failed', reason: hueError(reply, body) };
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

type Reads = Readonly<{ lights: Read; rooms: Read; groups: Read }>;

type Problem = Exclude<Read, { kind: 'data' }>;

const isProblem = (read: Read): read is Problem => read.kind !== 'data';

const homeOf = (reads: Reads): HomeData => ({
  kind: 'home',
  household: householdOf({
    lights: dataIn(reads.lights),
    rooms: dataIn(reads.rooms),
    groups: dataIn(reads.groups),
  }),
});

// A refused key is forgotten, so the page asks to connect the Bridge again.
async function problemOf(argo: HueCalls, problem: Problem): Promise<HomeData> {
  if (problem.kind === 'failed') return problem;
  await argo.secrets.delete(applicationKeySecret);

  return { kind: 'connect' };
}

function settled(argo: HueCalls, reads: Reads): HomeData | Promise<HomeData> {
  const problem = Object.values(reads).find(isProblem);

  return problem ? problemOf(argo, problem) : homeOf(reads);
}

async function household(argo: HueCalls, key: string): Promise<HomeData> {
  const read = (kind: HueResource): Promise<Read> =>
    resources(argo, { kind, key });

  const [lights, rooms, groups] = await Promise.all([
    read('light'),
    read('room'),
    read('grouped_light'),
  ]);

  return settled(argo, { lights, rooms, groups });
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

// Switches or dims one light or a room's grouped light, then has the page read again.
export async function change(
  argo: HueCalls,
  target: { kind: Switchable; id: string; body: Json },
): Promise<void> {
  const key = await keyOf(argo);

  const read = await answerOf(
    await accountFetch(argo, hueHost)(
      resourceUrlOf(target.kind, target.id),
      jsonRequest('PUT', target.body, keyed(key)),
    ),
  );

  argo.changed();

  if (read.kind !== 'data') throw new Error(reasonOf(read));
}
