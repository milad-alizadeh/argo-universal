import {
  measureList,
  type DragScroller,
  type Measure,
  type Measured,
  type MeasureZone,
} from './list-drag-measure';
import type { Rect } from './list-geometry';

// Removes `value` from `map` when it is still the one registered under `key`.
const unregister =
  <Key, Value>(map: Map<Key, Value>, key: Key, value: Value) =>
  (): void => {
    if (map.get(key) === value) map.delete(key);
  };

// A press on a row, and the List measured around it once the measurement lands.
interface Pressed {
  id: string;
  measured?: Measured;
}

// What draws in one List and measures itself for a drag: its drag layer, rows, Section zones and scrollers.
export class DragRegistry {
  private readonly rows = new Map<string, Measure>();
  private readonly zones = new Map<string, MeasureZone>();
  private readonly scrollers = new Set<DragScroller>();
  private pressed: Pressed | undefined;

  public constructor(private readonly layer: Measure) {}

  public registerRow(id: string, measure: Measure): () => void {
    this.rows.set(id, measure);

    return unregister(this.rows, id, measure);
  }

  public registerZone(sectionKey: string, measure: MeasureZone): () => void {
    this.zones.set(sectionKey, measure);

    return unregister(this.zones, sectionKey, measure);
  }

  public registerScroller(scroller: DragScroller): () => void {
    this.scrollers.add(scroller);

    return (): boolean => this.scrollers.delete(scroller);
  }

  // Measures the List around row `id` as a press on it begins, so a lift from that press draws from its first move.
  public prepare(id: string): void {
    const pressed: Pressed = { id };

    this.pressed = pressed;
    void this.measureAround(id).then((measured) => {
      pressed.measured = measured;
    });
  }

  // The List as the press on row `id` measured it, once; none while that measurement is still on its way.
  public measuredPress(id: string): Measured | undefined {
    const pressed = this.pressed;

    this.pressed = undefined;

    return pressed?.id === id ? pressed.measured : undefined;
  }

  // The List around lifted row `id`, last measured at `before`.
  public measureAround(
    id: string,
    before?: Rect,
  ): Promise<Measured | undefined> {
    const { layer, rows, zones, scrollers } = this;

    return measureList({ layer, rows, zones, scrollers }, id, before);
  }
}
