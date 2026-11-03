import type { ViewInstance } from 'react-native';
import { duration } from './collapsible-context';

/*
 * The web's open and close: the box around the content moves its height with a CSS transition, aimed at the height
 * the content lays out at. A ResizeObserver reads that height again whenever it changes while the box moves, so
 * content that settles after it mounts (a placeholder giving way, a Plugin's tree arriving, a late glyph) turns the
 * motion towards where it will rest instead of overshooting it and snapping back at the end. At rest the box takes
 * its content's height, so content that changes while open is never clipped. The curve and length are the chevron's,
 * Easing.inOut(Easing.quad) over the same 200ms, so the two move as one. Reduced motion takes one step each way.
 */
const transition = `height ${duration}ms cubic-bezier(0.455, 0.03, 0.515, 0.955)`;

// Ends a motion whose transitionend never comes, such as one aimed at the height the box already has.
const fallbackAfter = duration * 2;

const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const domNode = (view: ViewInstance | null): HTMLElement | null =>
  view instanceof HTMLElement ? view : null;

const heightOf = (node: HTMLElement): number =>
  node.getBoundingClientRect().height;

// Pins the box at a height with nothing moving, so the next height it is given moves from there.
function hold(box: HTMLElement, height: number): void {
  box.style.transition = 'none';
  box.style.height = `${height}px`;
  box.getBoundingClientRect();
}

// Where the box is going: resting at its content's height, moving towards it, or moving towards nothing (or held there).
type Heading = 'rest' | 'content' | 'nothing';

export class HeightMotion {
  private box: HTMLElement | null = null;

  private content: HTMLElement | null = null;

  private heading: Heading;

  private forceMount = false;

  // Whether the box mounted in the commit now being handled.
  private attached = false;

  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly observer = new ResizeObserver(() => this.follow());

  constructor(
    openAtStart: boolean,
    private readonly onLeave: (mounted: false) => void,
  ) {
    this.heading = openAtStart ? 'rest' : 'nothing';
  }

  readonly setBox = (view: ViewInstance | null): void => {
    this.box?.removeEventListener('transitionend', this.onEnd);
    this.box = domNode(view);
    this.attachBox();
  };

  readonly setContent = (view: ViewInstance | null): void => {
    this.observer.disconnect();
    this.content = domNode(view);

    if (this.content) this.observer.observe(this.content);
  };

  // Starts the motion when the content opens or closes; content that mounts open, as a card shown open does, rests as it is.
  toggle(isOpen: boolean, forceMount: boolean): void {
    this.forceMount = forceMount;
    const fresh = this.attached;
    this.attached = false;
    const box = this.box;

    if (box && isOpen === (this.heading === 'nothing'))
      this.turn(box, isOpen, fresh);
  }

  private attachBox(): void {
    const box = this.box;

    if (!box) return;

    this.attached = true;

    if (this.heading === 'nothing') hold(box, 0);
    box.addEventListener('transitionend', this.onEnd);
  }

  private turn(box: HTMLElement, isOpen: boolean, fresh: boolean): void {
    if (isOpen) return this.open(box, fresh);
    this.close(box);
  }

  /*
   * Content already there turns back towards its height straight away. Content that has just mounted waits at nothing
   * for the observer's first look at its layout, which comes once the commit that mounted it has finished: a motion
   * started inside that commit would count a slow mount as time already moved and jump ahead on its first frame.
   */
  private open(box: HTMLElement, fresh: boolean): void {
    if (reducedMotion()) return this.rest(box);
    this.heading = 'content';

    if (!fresh) this.moveTo(box, this.contentHeight());
  }

  private close(box: HTMLElement): void {
    if (reducedMotion()) return this.leaveNow(box);

    if (this.heading === 'rest') hold(box, heightOf(box));
    this.heading = 'nothing';
    this.moveTo(box, 0);
  }

  // While the box moves towards its content, each new height the content lays out at becomes where it heads.
  private follow(): void {
    const box = this.box;

    if (box && this.heading === 'content')
      this.moveTo(box, this.contentHeight());
  }

  private contentHeight(): number {
    return this.content ? heightOf(this.content) : 0;
  }

  private moveTo(box: HTMLElement, height: number): void {
    box.style.transition = transition;
    box.style.height = `${height}px`;
    clearTimeout(this.timer);
    this.timer = setTimeout(this.finish, fallbackAfter);
  }

  private readonly onEnd = (event: TransitionEvent): void => {
    if (event.target === this.box && event.propertyName === 'height')
      this.finish();
  };

  private readonly finish = (): void => {
    clearTimeout(this.timer);
    const box = this.box;

    if (!box) return;

    if (this.heading === 'nothing') return this.leave();
    this.rest(box);
  };

  // The box's height comes from its content again, with nothing to move.
  private rest(box: HTMLElement): void {
    this.heading = 'rest';
    box.style.transition = '';
    box.style.height = '';
  }

  private leaveNow(box: HTMLElement): void {
    this.heading = 'nothing';
    hold(box, 0);
    this.leave();
  }

  private leave(): void {
    if (!this.forceMount) this.onLeave(false);
  }
}
