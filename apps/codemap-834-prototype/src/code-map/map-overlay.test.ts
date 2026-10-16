import { describe, expect, it, vi, type Mock } from 'vitest';
import type { Insets, Label } from './labels/map-labels';
import { createMapOverlay, type CodeMapOverlay } from './map-overlay';
import type { RendererInfo } from './model';

function label(id: string, x = 10): Label {
  return { id, text: `${id}.ts`, x, y: 80, maxWidth: 200 };
}

const open: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

const bands: Insets = { ...open, top: 55, bottom: 170 };

const info: RendererInfo = { engine: 'Skia / CanvasKit CPU', files: 2, dpr: 1 };

interface Observed extends CodeMapOverlay {
  observer: {
    drawn: Mock<(info: RendererInfo) => void>;
    labels: Mock<(count: number) => void>;
  };
}

function overlay(): Observed {
  const observer = {
    drawn: vi.fn<(info: RendererInfo) => void>(),
    labels: vi.fn<(count: number) => void>(),
  };

  return { ...createMapOverlay(observer), observer };
}

describe('Code Map overlay', () => {
  it('shows the labels a view places', () => {
    const map = overlay();
    map.overlay.showLabels([label('app'), label('server', 300)]);

    expect(map.labels.current().map(({ id }) => id)).toEqual(['app', 'server']);
  });

  it('reports how many labels a view places', () => {
    const map = overlay();
    map.overlay.showLabels([label('app'), label('server', 300)]);

    expect(map.observer.labels).toHaveBeenLastCalledWith(2);
  });

  it('starts with no labels', () => {
    expect(overlay().labels.current()).toEqual([]);
  });

  it('does not redraw the labels when a view places the same labels again', () => {
    const map = overlay();
    const listener = vi.fn<() => void>();
    map.labels.subscribe(listener);
    map.overlay.showLabels([label('app')]);
    map.overlay.showLabels([label('app')]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(map.observer.labels).toHaveBeenCalledTimes(1);
  });

  it('redraws the labels when one moves', () => {
    const map = overlay();
    const listener = vi.fn<() => void>();
    map.labels.subscribe(listener);
    map.overlay.showLabels([label('app', 10)]);
    map.overlay.showLabels([label('app', 11)]);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(map.labels.current().at(0)?.x).toBe(11);
  });

  it('stops redrawing for a listener that unsubscribed', () => {
    const map = overlay();
    const listener = vi.fn<() => void>();
    map.labels.subscribe(listener)();
    map.overlay.showLabels([label('app')]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('reports readiness once, for the first frame drawn', () => {
    const map = overlay();
    const later = vi.fn<() => RendererInfo>(() => info);
    map.overlay.drawn(() => info);
    map.overlay.drawn(later);

    expect(map.observer.drawn).toHaveBeenCalledTimes(1);
    expect(map.observer.drawn).toHaveBeenCalledWith(info);
    expect(later).not.toHaveBeenCalled();
  });

  it('starts with no bands covered', () => {
    expect(overlay().overlay.insets.current()).toEqual(open);
  });

  it('gives the renderer the bands Code Map measured', () => {
    const map = overlay();
    map.cover(bands);

    expect(map.overlay.insets.current()).toEqual(bands);
  });

  it('tells the renderer only when the measured bands change', () => {
    const map = overlay();
    const listener = vi.fn<() => void>();
    map.overlay.insets.subscribe(listener);
    map.cover(bands);
    map.cover({ ...bands });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
