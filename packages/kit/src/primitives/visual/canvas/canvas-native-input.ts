import {
  PanResponder,
  type GestureResponderEvent,
  type PanResponderCallbacks,
} from 'react-native';
import { CanvasGesture, type CanvasPointer } from './canvas-gesture';
import type { CanvasFrameProps } from './canvas-props';

function pointers(event: GestureResponderEvent): CanvasPointer[] {
  return event.nativeEvent.touches.map((touch) => ({
    id: touch.identifier,
    point: { x: touch.locationX, y: touch.locationY },
  }));
}

export class NativeCanvasInput {
  private props: CanvasFrameProps;
  private readonly gesture = new CanvasGesture();
  public readonly responder;

  public constructor(props: CanvasFrameProps) {
    this.props = props;
    this.responder = PanResponder.create(nativeEvents(this));
  }

  public update(props: CanvasFrameProps): void {
    this.props = props;
  }

  public begin(event: GestureResponderEvent): void {
    for (const pointer of pointers(event))
      this.gesture.begin(pointer, this.props.view);
  }

  public move(event: GestureResponderEvent): void {
    const views = pointers(event).map((pointer) => this.gesture.move(pointer));
    const view = views.at(-1);

    if (view && this.props.camera === 'pan-zoom') this.props.onCamera(view);
  }

  public release(event: GestureResponderEvent): void {
    for (const touch of event.nativeEvent.changedTouches) {
      if (this.gesture.release(touch.identifier))
        this.props.onPress({ x: touch.locationX, y: touch.locationY });
    }
  }

  public end(event: GestureResponderEvent): void {
    if (event.nativeEvent.touches.length > 0) this.release(event);
  }

  public cancel(): void {
    this.gesture.cancelAll();
  }
  public canTerminate(): boolean {
    return this.props.camera === 'fixed';
  }
}

function nativeEvents(input: NativeCanvasInput): PanResponderCallbacks {
  return {
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => input.begin(event),
    onPanResponderStart: (event) => input.begin(event),
    onPanResponderMove: (event) => input.move(event),
    onPanResponderRelease: (event) => input.release(event),
    onPanResponderEnd: (event) => input.end(event),
    onPanResponderTerminationRequest: () => input.canTerminate(),
    onPanResponderTerminate: () => input.cancel(),
  };
}
