import {
  measureList,
  type DragScroller,
  type Measure,
  type Measured,
  type MeasureZone,
} from './list-drag-measure';
import type { Rect } from './list-drop-aim';

// Removes `value` from `map` when it is still the one registered under `key`.
const unregister =
  <Key, Value>(map: Map<Key, Value>, key: Key, value: Value) =>
  (): void => {
    if (map.get(key) === value) map.delete(key);
  };

// What draws in one List and measures itself for a drag: its drag layer, rows, Section zones and scrollers.
export class DragRegistry {
  private readonly rows = new Map<string, Measure>();
  private readonly zones = new Map<number, MeasureZone>();
  private readonly scrollers = new Set<DragScroller>();

  constructor(private readonly layer: Measure) {}

  registerRow(id: string, measure: Measure): () => void {
    this.rows.set(id, measure);

    return unregister(this.rows, id, measure);
  }

  registerZone(section: number, measure: MeasureZone): () => void {
    this.zones.set(section, measure);

    return unregister(this.zones, section, measure);
  }

  registerScroller(scroller: DragScroller): () => void {
    this.scrollers.add(scroller);

    return (): boolean => this.scrollers.delete(scroller);
  }

  // The List around lifted row `id`, last measured at `before`.
  protected measureAround(
    id: string,
    before: Rect | undefined,
  ): Promise<Measured | undefined> {
    const { layer, rows, zones, scrollers } = this;

    return measureList({ layer, rows, zones, scrollers }, id, before);
  }
}
