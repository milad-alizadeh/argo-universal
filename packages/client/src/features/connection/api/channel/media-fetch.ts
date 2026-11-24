import { ByteQueue } from './byte-queue';
import { concatBytes } from './bytes';
import { channelRequest } from './channel-request';
import {
  readHead,
  requestBytes,
  type HttpRequest,
  type HttpResponseHead,
} from './http-exchange';
import type { SecureStream } from './secure-stream';

// How many Blobs and Plugin assets are on their way at once. A phone gains nothing from more, and each one slows the first image down.
export const maxConcurrentDownloads = 4;

// What a read needs of an opened channel.
export interface MediaChannel {
  readonly stream: Pick<SecureStream, 'write' | 'listen' | 'close'>;
}

export interface MediaFetchDeps {
  readonly openChannel: () => Promise<MediaChannel>;
  readonly randomBytes: (length: number) => Uint8Array;
  // Answers what one shared channel cannot: a call that is not a read, and a response with no length to frame it by. It opens a channel of its own.
  readonly fallback: typeof fetch;
  // How many reads are on the way at once; `maxConcurrentDownloads` unless a test measures another.
  readonly window?: number;
}

interface Job {
  readonly request: HttpRequest;
  readonly resolve: (response: Response) => void;
  readonly reject: (error: Error) => void;
  // How many channels this read was written to; one the Server closed while the read waited is tried once more.
  sent: number;
  // The caller gave up on it. A read still waiting is never sent; one on the wire is read to its end and thrown away, since the channel's next response follows it.
  aborted: boolean;
}

interface Answered {
  head: HttpResponseHead;
  body: Uint8Array;
}

const noContent = 204;

const notModified = 304;

const noBody = new Set([noContent, notModified]);

const lengthOf = (head: HttpResponseHead): number | undefined => {
  if (noBody.has(head.status)) return 0;
  const length = head.headers.get('content-length');

  // Anything but digits is no length to frame a body by.
  return length !== undefined && /^\d+$/.test(length)
    ? Number(length)
    : undefined;
};

const errorOf = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

/*
 * Reads one response after another off a channel's bytes. A head is joined once it is whole, and a body once it is whole, so an image that arrives in many records is not copied again for each.
 */
function responseReader(
  answer: (answered: Answered) => void,
  unframed: () => void,
): (chunk: Uint8Array) => void {
  const body = new ByteQueue();
  let head: Uint8Array = new Uint8Array(0);
  let current: { head: HttpResponseHead; length: number } | undefined;

  const bodyDone = (): void => {
    if (!current || body.length < current.length) return;
    answer({ head: current.head, body: body.take(current.length) });
    current = undefined;
  };

  const headDone = (chunk: Uint8Array): void => {
    head = concatBytes(head, chunk);
    const read = readHead(head);

    if (!read) return;
    head = new Uint8Array(0);
    const length = lengthOf(read.head);

    if (length === undefined) return unframed();
    current = { head: read.head, length };
    body.push(read.rest);
  };

  return (chunk) => {
    if (current) body.push(chunk);
    else headDone(chunk);
    bodyDone();

    // What follows a finished body is the next response's head.
    while (!current && body.length > 0) {
      headDone(body.take(body.length));
      bodyDone();
    }
  };
}

// What a lane tells the queue that owns it.
interface LaneEvents {
  answered: (job: Job, response: Response) => void;
  // The channel ended with these reads unanswered.
  ended: (jobs: Job[], error: Error) => void;
  // The first read's response has no length, so it goes to a channel of its own; the reads behind it are sent again.
  unframed: (first: Job | undefined, rest: Job[]) => void;
}

interface Lane {
  send: (job: Job) => void;
}

const responseOf = ({ head, body }: Answered): Response =>
  new Response(body.length > 0 ? new Uint8Array(body) : null, {
    status: head.status,
    headers: Object.fromEntries(head.headers),
  });

function laneOn(
  { stream }: MediaChannel,
  events: LaneEvents,
  gone: () => void,
): Lane {
  const inFlight: Job[] = [];
  let ended = false;

  const end = (error?: Error): void => {
    if (ended) return;
    ended = true;
    gone();
    stream.close();
    events.ended(
      inFlight.splice(0),
      error ?? new Error('The Server closed the channel'),
    );
  };

  const read = responseReader(
    (answered) => {
      const job = inFlight.shift();

      if (job) events.answered(job, responseOf(answered));
    },
    () => {
      const [first, ...rest] = inFlight.splice(0);
      end();
      events.unframed(first, rest);
    },
  );

  stream.listen({ onData: read, onClose: end });

  return {
    send: (job): void => {
      job.sent += 1;
      inFlight.push(job);
      stream.write(requestBytes(job.request, 'HTTP/1.1'));
    },
  };
}

// The reads waiting for a place, how many are on the way, and the one lane they share.
interface Queue {
  readonly deps: MediaFetchDeps;
  readonly waiting: Job[];
  running: number;
  lane: Promise<Lane> | undefined;
}

function pump(queue: Queue): void {
  while (queue.running < (queue.deps.window ?? maxConcurrentDownloads)) {
    const job = queue.waiting.shift();

    if (!job) return;

    if (!job.aborted) {
      queue.running += 1;
      start(queue, job);
    }
  }
}

function finish(queue: Queue): void {
  queue.running -= 1;
  pump(queue);
}

function retryOrFail(queue: Queue, job: Job, error: Error): void {
  if (job.sent >= 2) job.reject(error);
  else queue.waiting.unshift(job);
  finish(queue);
}

async function viaFallback(queue: Queue, job: Job): Promise<void> {
  const { method, path, headers, body } = job.request;

  try {
    job.resolve(
      await queue.deps.fallback(path, {
        method,
        headers,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      }),
    );
  } catch (cause) {
    job.reject(errorOf(cause));
  } finally {
    finish(queue);
  }
}

const eventsOf = (queue: Queue): LaneEvents => ({
  answered: (job, response) => {
    job.resolve(response);
    finish(queue);
  },
  ended: (jobs, error) => {
    for (const job of jobs) retryOrFail(queue, job, error);
  },
  unframed: (first, rest) => {
    if (first) void viaFallback(queue, first);

    for (const job of rest) retryOrFail(queue, job, new Error('Sent again'));
  },
});

async function openLane(queue: Queue): Promise<Lane> {
  const channel = await queue.deps.openChannel();

  return laneOn(channel, eventsOf(queue), () => {
    queue.lane = undefined;
  });
}

function start(queue: Queue, job: Job): void {
  if (job.request.method !== 'GET') {
    void viaFallback(queue, job);

    return;
  }

  queue.lane ??= openLane(queue).catch((cause: unknown) => {
    queue.lane = undefined;
    throw cause;
  });

  queue.lane.then(
    (ready) => ready.send(job),
    (cause: unknown) => {
      job.reject(errorOf(cause));
      finish(queue);
    },
  );
}

/*
 * `fetch` for Blobs and Plugin assets: every read goes down one channel the App keeps, with up to four of them on the way at once (HTTP/1.1 pipelining), instead of a channel and a handshake for each image.
 * The Server answers HTTP/1.1 inside a channel as it answers 1.0, so an older Server serves it as it is. It closes a channel left idle for a few seconds, and the next read opens a new one.
 */
export const mediaFetch = (deps: MediaFetchDeps): typeof fetch => {
  const queue: Queue = { deps, waiting: [], running: 0, lane: undefined };

  return async (input, init) => {
    const signal = init?.signal ?? undefined;

    signal?.throwIfAborted();
    const request = await channelRequest(input, init, deps.randomBytes);

    return new Promise<Response>((resolve, reject): void => {
      const job: Job = { request, resolve, reject, sent: 0, aborted: false };

      signal?.addEventListener(
        'abort',
        () => {
          job.aborted = true;
          const waiting = queue.waiting.indexOf(job);

          if (waiting >= 0) queue.waiting.splice(waiting, 1);
          reject(errorOf(signal.reason));
        },
        { once: true },
      );
      queue.waiting.push(job);
      pump(queue);
    });
  };
};
