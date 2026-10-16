interface NotificationRecord {
  title: string;
  body: string | undefined;
  tag: string | undefined;
  closed: boolean;
}

declare global {
  interface Window {
    notificationProbe: {
      records: NotificationRecord[];
      click: () => void;
    };
  }
}

export function installNotificationStub(): void {
  const records: NotificationRecord[] = [];
  const clicks: (() => void)[] = [];

  window.notificationProbe = {
    records,
    click: (): void => clicks.at(-1)?.(),
  };

  class NotificationStub {
    public static readonly permission = 'granted';
    public onclick: (() => void) | null = null;
    private record: NotificationRecord;

    public constructor(title: string, options: NotificationOptions) {
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

  Object.defineProperty(window, 'Notification', { value: NotificationStub });
}
