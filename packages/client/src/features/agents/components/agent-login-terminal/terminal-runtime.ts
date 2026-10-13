import type { AgentLoginTerminalInput } from '@repo/contracts';
import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from '@xterm/xterm';
import { defaultTerminalAppearance } from './terminal-appearance';
import { terminalInputChunks } from './terminal-input';
import type { LoginTerminalProps } from './terminal-props';
const pollInterval = 150;
export type TerminalRuntimeInput = {
  terminal: Terminal;
  fit: FitAddon;
  props: () => LoginTerminalProps;
  control: (text: string) => string;
};
export class TerminalRuntime {
  private stopped = false;
  private blocked = false;
  private cursor = 0;
  private queue = Promise.resolve();
  private timer?: ReturnType<typeof setTimeout>;
  private readonly observer: ResizeObserver;
  private readonly data: { dispose: () => void };
  public constructor(private readonly input: TerminalRuntimeInput) {
    this.observer = new ResizeObserver(() => this.resize());
    const element = input.terminal.element;
    if (element) this.observer.observe(element.parentElement ?? element);
    this.data = input.terminal.onData((text) => this.send(input.control(text)));
    this.resize();
    void this.poll();
  }
  public send(text: string): void {
    this.focus();
    for (const chunk of terminalInputChunks(text))
      this.enqueue({ type: 'write', text: chunk });
  }
  public focus(): void {
    if (this.enabled()) this.input.terminal.focus();
  }
  public close(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.observer.disconnect();
    this.data.dispose();
  }
  private enabled(): boolean {
    return this.live() && this.input.props().enabled;
  }
  private live(): boolean {
    return !this.stopped && !this.blocked;
  }
  private enqueue(input: AgentLoginTerminalInput): void {
    if (!this.enabled()) return;
    this.queue = this.queue
      .then(() => this.deliver(input))
      .catch(() =>
        this.fail(
          'Terminal input could not be delivered. Reconnect before continuing.',
        ),
      );
  }
  private async deliver(input: AgentLoginTerminalInput): Promise<void> {
    if (this.enabled()) await this.input.props().onInput(input);
  }
  private resize(): void {
    this.input.fit.fit();
    const { cols, rows } = this.input.terminal;
    this.enqueue({ type: 'resize', cols, rows });
  }
  private async poll(): Promise<void> {
    if (this.stopped) return;
    if (this.enabled()) await this.read();
    this.schedule();
  }
  private async read(): Promise<void> {
    try {
      const frame = await this.input.props().onRead(this.cursor);
      if (this.stopped) return;
      this.input.terminal.write(frame.output);
      this.cursor = frame.cursor;
      this.finishFrame(frame.closed);
    } catch {
      await this.fail('Terminal output is unavailable. Reconnect to continue.');
    }
  }
  private schedule(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      void this.poll();
    }, pollInterval);
  }
  private finishFrame(closed: boolean | undefined): void {
    if (closed) this.close();
  }
  public refresh(): void {
    this.blocked = false;
    this.updateTheme();
    this.input.terminal.options.disableStdin = !this.enabled();
    if (this.enabled()) this.resize();
  }
  private updateTheme(): void {
    const colors = this.input.props().appearance ?? defaultTerminalAppearance;
    this.input.terminal.options.theme = {
      background: colors.background,
      foreground: colors.foreground,
      cursor: colors.foreground,
    };
  }
  private async fail(message: string): Promise<void> {
    if (!this.enabled()) return;
    this.blocked = true;
    await this.input.props().onFailure(message);
  }
}
