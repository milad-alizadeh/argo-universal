interface NotificationRecord {
  title: string;
  body: string | undefined;
  tag: string | undefined;
  closed: boolean;
}

declare global {
  var notificationProbe: {
    records: NotificationRecord[];
    click: () => void;
    failNext: () => void;
    attempts: number;
  };
}

export function installNotificationStub(): void {
  const records: NotificationRecord[] = [];
  const clicks: (() => void)[] = [];
  let failNext = false;

  globalThis.notificationProbe = {
    records,
    click: (): void => clicks.at(-1)?.(),
    failNext: (): void => {
      failNext = true;
    },
    attempts: 0,
  };

  class NotificationStub {
    public static readonly permission = 'granted';
    public onclick: (() => void) | null = null;
    private record: NotificationRecord;

    public constructor(
      title: string,
      options: Partial<Pick<NotificationRecord, 'body' | 'tag'>>,
    ) {
      globalThis.notificationProbe.attempts += 1;

      if (failNext) {
        failNext = false;
        throw new Error('Native notification delivery failed');
      }

      this.record = {
        title,
        body: options.body,
        tag: options.tag,
        closed: false,
      };
      records.push(this.record);
      clicks.push(() => this.onclick?.());
    }

    public close(): void {
      this.record.closed = true;
    }
  }

  Object.defineProperty(globalThis, 'Notification', {
    value: NotificationStub,
  });
}

export const recordedNotificationBodies = (): (string | undefined)[] =>
  globalThis.notificationProbe.records.map((notice) => notice.body);
