import {
  silentSpectrum,
  type VoiceLevels,
  type VoiceSpectrum,
} from '../../src/features/conversation/types/conversation-connection';

const millisecondsPerSecond = 1000;

const turn = Math.PI * 2;

// Syllables a second, and how the phrase swells and falls over a few seconds.
const syllableRate = 2.2;

const phraseRate = 0.7;

// Speech is loudest in its low bands and falls away towards the high ones.
const tilt = 0.75;

const flutterRate = 7;

// How far apart the voice's syllables fall from the person's, so the two sides never move as one.
const voiceLag = 0.37;

// How loud speech is at this moment, from 0 to 1: syllables inside a phrase that swells and falls.
function envelopeAt(seconds: number): number {
  const syllable = Math.max(0, Math.sin(seconds * syllableRate * turn));
  const phrase = (Math.sin(seconds * phraseRate * turn) + 1) / 2;

  return Math.sqrt(syllable) * (0.35 + 0.65 * phrase);
}

function fill(bands: Float32Array, seconds: number): void {
  const envelope = envelopeAt(seconds);

  for (const [band] of bands.entries()) {
    const fall = 1 - (band / bands.length) * tilt;
    const flutter = 0.75 + 0.25 * Math.sin(seconds * flutterRate + band * 1.7);
    bands[band] = envelope * fall * flutter;
  }
}

const now = (): number => performance.now() / millisecondsPerSecond;

const levels = (): VoiceLevels => ({
  input: envelopeAt(now()),
  output: envelopeAt(now() + voiceLag),
});

// What the orb and the band read of a call's sound.
interface VoiceAudio {
  levels: () => VoiceLevels;
  spectrum: () => VoiceSpectrum;
}

/*
 * Talking-like levels and bands with no microphone and no voice, for stories: the person's and the voice's sound move
 * on the clock, a moment apart, as a call's would.
 */
export function syntheticVoiceAudio(): VoiceAudio {
  const bands = silentSpectrum();

  const spectrum = (): VoiceSpectrum => {
    fill(bands.input, now());
    fill(bands.output, now() + voiceLag);

    return bands;
  };

  return { levels, spectrum };
}
