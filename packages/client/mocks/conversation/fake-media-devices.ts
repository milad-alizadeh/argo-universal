// The browser's list of microphones and speakers, held in memory, so a test can plug one in or take one out.
export class FakeMediaDevices {
  private devices: MediaDeviceInfo[] = [];
  private readonly listeners = new Set<() => void>();

  public constructor(devices: Partial<MediaDeviceInfo>[] = []) {
    this.set(devices);
  }

  public enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return Promise.resolve(this.devices);
  }

  public addEventListener(type: string, listener: () => void): void {
    if (type === 'devicechange') this.listeners.add(listener);
  }

  public removeEventListener(type: string, listener: () => void): void {
    if (type === 'devicechange') this.listeners.delete(listener);
  }

  public listening(): number {
    return this.listeners.size;
  }

  // The devices change, and the browser says so.
  public change(devices: Partial<MediaDeviceInfo>[]): void {
    this.set(devices);

    for (const listener of this.listeners) listener();
  }

  private set(devices: Partial<MediaDeviceInfo>[]): void {
    this.devices = devices.map((device) => ({
      deviceId: '',
      groupId: '',
      kind: 'audioinput',
      label: '',
      toJSON: (): Partial<MediaDeviceInfo> => device,
      ...device,
    }));
  }
}
