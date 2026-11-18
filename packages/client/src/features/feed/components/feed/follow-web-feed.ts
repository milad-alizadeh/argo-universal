/*
 * The time constant of a critically damped spring, in milliseconds. Its closed form
 * keeps the same trajectory on 60 Hz and high-refresh displays.
 */
const responseTime = 80;

// After a delayed paint, catch up over the next few frames.
const maxFrameTime = 24;

const halfPixel = 0.5;

interface Motion {
  offset: number;
  velocity: number;
}

function advance(offset: number, velocity: number, elapsed: number): Motion {
  const decay = Math.exp(-elapsed / responseTime);
  const slope = velocity + offset / responseTime;

  return {
    offset: (offset + slope * elapsed) * decay,
    velocity: (velocity - (slope * elapsed) / responseTime) * decay,
  };
}

type ScrollBox = Pick<
  HTMLElement,
  'scrollTop' | 'scrollHeight' | 'clientHeight'
>;

export class WebFeedGlide {
  private frame = 0;
  private previous = 0;
  private position = 0;
  private velocity = 0;

  constructor(private readonly node: ScrollBox) {}

  start(): void {
    if (this.frame) return;
    this.position = this.node.scrollTop;
    this.velocity = 0;
    this.previous = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  // An explicit jump or a viewport resize can move the list between frames.
  private syncPosition(): void {
    if (Math.abs(this.node.scrollTop - this.position) <= 1) return;
    this.position = this.node.scrollTop;
    this.velocity = 0;
  }

  private readonly tick = (now: number): void => {
    this.syncPosition();
    const end = this.node.scrollHeight - this.node.clientHeight;
    const elapsed = Math.max(0, Math.min(now - this.previous, maxFrameTime));
    const next = advance(this.position - end, this.velocity, elapsed);
    const settled = next.offset >= -halfPixel;

    this.position = settled ? end : end + next.offset;
    this.velocity = next.velocity;
    this.previous = now;
    this.node.scrollTop = this.position;
    this.frame = settled ? 0 : requestAnimationFrame(this.tick);
  };
}
