import type {
  ConversationAudioDevice,
  ConversationDeviceChange,
  ConversationDeviceList,
  ConversationDeviceReport,
  ConversationDeviceRequest,
} from '@repo/contracts';
import { Queue } from '../rpc';
import { unavailable } from './unavailable';
import { refuse } from './voice-choice-rules';

// One App listening for device choices: the Connection it is on, what it reported, and where its requests go.
interface ListeningApp {
  connection: AbortSignal;
  report: ConversationDeviceReport;
  queue: Queue<ConversationDeviceRequest>;
}

const appOf = (
  report: ConversationDeviceReport,
  connection: AbortSignal,
): ListeningApp => ({
  connection,
  report,
  queue: new Queue<ConversationDeviceRequest>(),
});

const live = (app: ListeningApp): boolean => !app.connection.aborted;

const on =
  (connection: AbortSignal | null) =>
  (app: ListeningApp): boolean =>
    app.connection === connection;

// A device id the App has, or null for the system's; anything else is refused.
function requireDevice(
  devices: ConversationAudioDevice[],
  id: string | null | undefined,
): void {
  if (id && !devices.some((device) => device.id === id))
    throw refuse(`The App has no device ${id}`);
}

// What was left out of a change stays as it was.
const kept = (
  next: string | null | undefined,
  current: string | null,
): string | null => (next === undefined ? current : next);

const chosen = (
  report: ConversationDeviceReport,
  change: ConversationDeviceChange,
): ConversationDeviceReport => ({
  ...report,
  microphone: kept(change.microphone, report.microphone),
  speaker: kept(change.speaker, report.speaker),
});

/*
 * The microphones and speakers of the Apps that can carry a Conversation (ADR-0064). Each App reports them over its own
 * Connection and keeps its choice itself; an Agent or the CLI reads and changes them on one App: the one carrying the
 * running call, else the one that started the last call, else the one that connected last.
 */
export class ConversationDevices {
  private readonly apps: ListeningApp[] = [];
  private lastUsed: AbortSignal | null = null;

  public constructor(private readonly carrier: () => AbortSignal | null) {}

  // The App on this Connection started a call.
  public used(connection: AbortSignal | undefined): void {
    this.lastUsed = connection ?? null;
  }

  public async *listen(
    report: ConversationDeviceReport,
    connection: AbortSignal,
  ): AsyncGenerator<ConversationDeviceRequest> {
    const app = appOf(report, connection);

    this.apps.push(app);

    try {
      yield { type: 'ready' };
      yield* app.queue.items(connection);
    } finally {
      this.apps.splice(this.apps.indexOf(app), 1);
    }
  }

  public list(): ConversationDeviceList {
    return this.listOf(this.target());
  }

  public choose(change: ConversationDeviceChange): ConversationDeviceList {
    const app = this.target();
    requireDevice(app.report.microphones, change.microphone);
    requireDevice(app.report.speakers, change.speaker);
    app.report = chosen(app.report, change);
    app.queue.push({ type: 'choose', change });

    return this.listOf(app);
  }

  private listOf(app: ListeningApp): ConversationDeviceList {
    return { ...app.report, carriesCall: on(this.carrier())(app) };
  }

  private candidate(): ListeningApp | undefined {
    const apps = this.apps.filter(live);

    return (
      apps.findLast(on(this.carrier())) ??
      apps.findLast(on(this.lastUsed)) ??
      apps.at(-1)
    );
  }

  private target(): ListeningApp {
    const app = this.candidate();

    if (!app)
      throw unavailable('No App that can carry a Conversation is connected');

    return app;
  }
}
