/*
 * A value that changes many times in a row, as a slider's does while it is dragged, sent once it rests: only the last
 * one, `delayMs` after it stopped changing, through the `send` it was pushed with. `flush` sends what is waiting at
 * once, as when the page goes away.
 */
export class SettledValue<Value> {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private waiting: { value: Value; send: (value: Value) => void } | undefined;

  public constructor(private readonly delayMs: number) {}

  public push(value: Value, send: (value: Value) => void): void {
    this.waiting = { value, send };
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.delayMs);
  }

  public flush(): void {
    const { waiting } = this;
    clearTimeout(this.timer);
    this.waiting = undefined;

    waiting?.send(waiting.value);
  }
}
