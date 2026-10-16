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
  };
}

export function installNotificationStub(): void {
  const records: NotificationRecord[] = [];
  const clicks: (() => void)[] = [];

  globalThis.notificationProbe = {
    records,
    click: (): void => clicks.at(-1)?.(),
  };

  class NotificationStub {
    public static readonly permission = 'granted';
    public onclick: (() => void) | null = null;
    private record: NotificationRecord;

    public constructor(
      title: string,
      options: Partial<Pick<NotificationRecord, 'body' | 'tag'>>,
    ) {
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
