import { describe, expect, it } from 'vitest';
import type { VoiceSpectrum } from '../../types/voice-connection';
import { heardOf, patternOf } from './visualiser-pattern';

const spectrum: VoiceSpectrum = {
  input: Float32Array.of(0.2, 0.4),
  output: Float32Array.of(0.6, 0.8),
};

describe('what a visualiser draws in each call state', () => {
  it('draws the connecting pattern until the call has sound to show', () => {
    expect(patternOf('none')).toBe('connecting');
  });

  it('draws sound while someone speaks, and the calm pattern while the Agent works', () => {
    expect(patternOf('listening')).toBe('listening');
    expect(patternOf('talking')).toBe('talking');
    expect(patternOf('thinking')).toBe('thinking');
  });
});

describe('whose sound a pattern draws', () => {
  it("draws the person's microphone while listening", () => {
    expect(heardOf('listening', spectrum)).toBe(spectrum.input);
  });

  it("draws the voice's output while it talks", () => {
    expect(heardOf('talking', spectrum)).toBe(spectrum.output);
  });

  it('draws no sound while thinking or connecting, so a stray noise never moves them', () => {
    expect(heardOf('thinking', spectrum)).toBeUndefined();
    expect(heardOf('connecting', spectrum)).toBeUndefined();
  });
});
