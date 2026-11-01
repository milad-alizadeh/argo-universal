import { z } from 'zod';

const maxSegmentLength = 128;

const maxPageSegments = 16;

// A stable id as Argo writes it: no separators, so it cannot name another path.
const StableId = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/)
  .max(maxSegmentLength);

const PluginId = z.string().regex(/^[a-z][a-z0-9-]*$/);

const isSafeSegment = (segment: string): boolean =>
  segment !== '.' && segment !== '..' && !/\p{Cc}/u.test(segment);

// One segment of a Plugin Page path, as the Plugin registered it; it never holds a slash.
const PageSegment = z
  .string()
  .min(1)
  .max(maxSegmentLength)
  .refine((segment) => !segment.includes('/') && isSafeSegment(segment), {
    message: 'A Page path segment is a dot segment or holds unsafe characters',
  });

/*
 * Where a Screen link goes, by stable ids and never by an address of the App's own routes.
 * A Plugin Page is named by its Plugin, the nav item it sits under and its own path.
 */
export const ScreenDestination = z.discriminatedUnion('screen', [
  z.strictObject({ screen: z.literal('session'), sessionId: StableId }),
  z.strictObject({ screen: z.literal('sessions') }),
  z.strictObject({ screen: z.literal('project'), projectId: StableId }),
  z.strictObject({ screen: z.literal('agents') }),
  z.strictObject({ screen: z.literal('settings') }),
  z.strictObject({
    screen: z.literal('plugin'),
    pluginId: PluginId,
    navId: StableId,
    page: z.array(PageSegment).max(maxPageSegments),
  }),
]);

export type ScreenDestination = z.infer<typeof ScreenDestination>;

export type ScreenLinkParse =
  | { ok: true; serverId: string; destination: ScreenDestination }
  | { ok: false; reason: string };

type IdDestination = Exclude<ScreenDestination, { screen: 'plugin' }>;

const idSegments = (destination: IdDestination): string[] => {
  if ('sessionId' in destination) return ['session', destination.sessionId];

  return 'projectId' in destination
    ? ['project', destination.projectId]
    : [destination.screen];
};

const segmentsOf = (destination: ScreenDestination): string[] =>
  destination.screen === 'plugin'
    ? ['plugin', destination.pluginId, destination.navId, ...destination.page]
    : idSegments(destination);

const linkPrefix = 'argo://open';

const pathPrefix = '/open';

const pathOf = (serverId: string, destination: ScreenDestination): string =>
  [serverId, ...segmentsOf(destination)].map(encodeURIComponent).join('/');

// The link that opens a destination on one Server, for the system's `argo://` protocol.
export const formatScreenLink = (
  serverId: string,
  destination: ScreenDestination,
): string => `${linkPrefix}/${pathOf(serverId, destination)}`;

// The same link as the App's own `/open` entry, which the web serves on its current origin.
export const screenLinkPath = (
  serverId: string,
  destination: ScreenDestination,
): string => `${pathPrefix}/${pathOf(serverId, destination)}`;

const refused: ScreenLinkParse = {
  ok: false,
  reason: 'Not a Screen link Argo can open',
};

// A segment with no slash once decoded: `%2F` would otherwise smuggle a separator through.
function decoded(encoded: string): string | undefined {
  try {
    const segment = decodeURIComponent(encoded);

    return segment.includes('/') ? undefined : segment;
  } catch {
    return undefined;
  }
}

const present = (segment: string | undefined): segment is string =>
  segment !== undefined && segment !== '';

function segmentsAfter(rest: string): string[] | undefined {
  if (/[?#]/.test(rest)) return undefined;
  const segments = rest.split('/').map(decoded);

  return segments.every(present) ? segments : undefined;
}

function afterPrefix(link: string): string | undefined {
  const prefix = [linkPrefix, pathPrefix].find((candidate) =>
    link.startsWith(`${candidate}/`),
  );

  return prefix === undefined ? undefined : link.slice(prefix.length + 1);
}

// What a path reads as before Zod judges it: a `screen` and the fields its segments fill.
interface Candidate {
  screen: string;
  sessionId?: string;
  projectId?: string;
  pluginId?: string;
  navId?: string;
  page?: string[];
}

type Reader = (rest: string[]) => Candidate | undefined;

const exactly =
  (count: number, build: (rest: string[]) => Candidate): Reader =>
  (rest) =>
    rest.length === count ? build(rest) : undefined;

const bare = (screen: string): [string, Reader] => [
  screen,
  exactly(0, () => ({ screen })),
];

// A Map, so a path segment such as `constructor` is never a destination.
const readers = new Map<string, Reader>([
  bare('sessions'),
  bare('agents'),
  bare('settings'),
  [
    'session',
    exactly(1, ([sessionId = '']): Candidate => ({
      screen: 'session',
      sessionId,
    })),
  ],
  [
    'project',
    exactly(1, ([projectId = '']): Candidate => ({
      screen: 'project',
      projectId,
    })),
  ],
  [
    'plugin',
    ([pluginId = '', navId = '', ...page]): Candidate => ({
      screen: 'plugin',
      pluginId,
      navId,
      page,
    }),
  ],
]);

function destinationFrom(path: string[]): ScreenDestination | undefined {
  const [kind, ...rest] = path;
  const parsed = ScreenDestination.safeParse(readers.get(String(kind))?.(rest));

  return parsed.success ? parsed.data : undefined;
}

function linkFrom(segments: string[]): ScreenLinkParse {
  const [serverId, ...path] = segments;
  const id = StableId.safeParse(serverId);
  const destination = destinationFrom(path);

  return id.success && destination
    ? { ok: true, serverId: id.data, destination }
    : refused;
}

// Reads a Screen link, from the system or from the App's `/open` path; anything else is refused whole.
export function parseScreenLink(link: string): ScreenLinkParse {
  const rest = afterPrefix(link);
  const segments = rest === undefined ? undefined : segmentsAfter(rest);

  return segments ? linkFrom(segments) : refused;
}
