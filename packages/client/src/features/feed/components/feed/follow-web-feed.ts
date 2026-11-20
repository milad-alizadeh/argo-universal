import type { LegendListRef } from '@legendapp/list/react-native';

/*
 * The time constant of a critically damped spring, in milliseconds. Its closed form
 * keeps the same trajectory on 60 Hz and high-refresh displays.
 */
const responseTime = 40;

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

interface FeedEnd {
  content: number;
  viewport: number;
}

// A larger viewport can clamp scrollTop backwards before the arriving row grows the content.
function atPreviousEnd(
  end: FeedEnd | undefined,
  viewport: number,
  bottom: number,
): boolean {
  return (
    !!end && viewport > end.viewport && Math.abs(bottom - end.content) <= 1
  );
}

interface FeedPosition extends FeedEnd {
  offset: number;
}

function shrankAtEnd(end: FeedEnd, node: ScrollBox): boolean {
  return (
    node.clientHeight < end.viewport &&
    Math.abs(node.scrollTop + end.viewport - end.content) <= 1
  );
}

export class WebFeedViewport {
  private end?: FeedEnd;

  // Recover only the exact old bottom when the browser grew the viewport under a following reader.
  clamped(
    { offset, viewport, content }: FeedPosition,
    following: boolean,
  ): boolean {
    const bottom = offset + viewport;
    const previous = this.end;
    this.end = undefined;

    if (following && Math.abs(bottom - content) <= 1) {
      this.end = { content, viewport };

      return false;
    }

    return atPreviousEnd(previous, viewport, bottom);
  }

  resized(node: ScrollBox, following: boolean): boolean {
    const viewport = node.clientHeight;

    // Layout can shrink the box before the list moves scrollTop to the new bottom.
    if (this.end && shrankAtEnd(this.end, node)) {
      this.end = { content: this.end.content, viewport };

      return false;
    }

    return this.clamped(
      { offset: node.scrollTop, viewport, content: node.scrollHeight },
      following,
    );
  }

  // Correct the browser's measured end before LegendList processes the pending scroll.
  sample(node: ScrollBox, following: boolean): void {
    if (this.resized(node, following)) node.scrollTop = node.scrollHeight;
  }

  watch(list: LegendListRef | null): (() => void) | undefined {
    if (!list) return;

    const node: unknown = list.getScrollableNode();

    if (!(node instanceof HTMLElement)) return;

    const sample = (): void =>
      this.sample(node, list.getState().isFollowingEnd);

    const observer = new ResizeObserver(sample);

    observer.observe(node);
    node.addEventListener('scroll', sample);

    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', sample);
      this.end = undefined;
    };
  }
}
