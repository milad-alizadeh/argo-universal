import { describe, expect, it, vi } from 'vitest';
import { observeEvidence, type Evidence } from './evidence-store';
import type { RendererInfo } from './model';

const info: RendererInfo = { engine: 'three.js / R3F', dpr: 1, files: 5000 };

function record(): Evidence {
  return { pan: () => Promise.reject(new Error('No renderer in a unit test')) };
}

const mountedAfter = (ms: number) => (): number => ms;

describe('measurement evidence', () => {
  it('marks a view ready with its renderer and mount time once it draws', () => {
    const evidence = record();
    observeEvidence(evidence, mountedAfter(42)).ready('flat', info);

    expect(evidence).toMatchObject({
      ready: true,
      view: 'flat',
      info,
      mountMs: 42,
    });
  });

  it('holds a pending view not ready, with no labels, until it draws', () => {
    const evidence = record();
    const observer = observeEvidence(evidence, mountedAfter(1));
    observer.ready('3d', info);
    observer.labels(4);
    observer.pending();

    expect(evidence).toMatchObject({ ready: false, labels: 0, info });
  });

  it('records the selected file', () => {
    const evidence = record();
    observeEvidence(evidence, mountedAfter(1)).selected('src/app.ts');

    expect(evidence.selectedId).toBe('src/app.ts');
  });

  it('tells subscribers when the evidence changes', () => {
    const observer = observeEvidence(record(), mountedAfter(1));
    const listener = vi.fn<() => void>();
    observer.subscribe(listener);
    observer.ready('3d', info);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not tell subscribers about a repeated label count', () => {
    const observer = observeEvidence(record(), mountedAfter(1));
    const listener = vi.fn<() => void>();
    observer.subscribe(listener);
    observer.labels(3);
    observer.labels(3);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
