import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Text } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { BrowserMicrophone } from './browser-microphone';
import { LevelMeter } from './level-meter';

const toneHz = 440;

// A quiet tone, so a raised gain still has room before the meter tops out.
const quiet = 0.01;

const doubled = 2;

// The meter's floor: a muted track still reads a few steps above nothing.
const nearSilence = 0.05;

const halved = 0.5;

interface Tone {
  stream: MediaStream;
  stop: () => void;
}

// A real browser stream standing in for the microphone: a steady tone, made on the page.
function toneStream(): Tone {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const destination = context.createMediaStreamDestination();
  oscillator.frequency.value = toneHz;
  volume.gain.value = quiet;
  oscillator.connect(volume).connect(destination);
  oscillator.start();
  void context.resume();

  return { stream: destination.stream, stop: () => void context.close() };
}

// Whether the sound sent reads louder, or quieter, than the microphone's own, once both carry sound.
const reads = (sent: LevelMeter, raw: LevelMeter, louder: boolean): boolean =>
  sent.level() > 0 && raw.level() > 0 && sent.level() > raw.level() === louder;

function Microphone(): React.JSX.Element {
  return <Text>Microphone gain</Text>;
}

const meta = {
  title: 'Tests/Voice/BrowserMicrophone',
  component: Microphone,
} satisfies Meta<typeof Microphone>;

export default meta;

type Story = StoryObj<typeof meta>;

// At full gain the peer is handed the browser's own track, so the call sounds exactly as it did before gain existed.
export const SendsTheBrowsersOwnTrackAtFullGain: Story = {
  play: async () => {
    const tone = toneStream();
    const microphone = new BrowserMicrophone(tone.stream);

    microphone.setGain(1);
    await expect(microphone.stream).toBe(tone.stream);

    microphone.setGain(doubled);
    microphone.setGain(1);
    await expect(microphone.stream).toBe(tone.stream);

    microphone.stop();
    tone.stop();
  },
};

// A raised gain sends the sound louder and a lowered one quieter, and a muted microphone sends silence through the gain.
export const RaisesAndLowersWhatIsSent: Story = {
  play: async () => {
    const tone = toneStream();
    const microphone = new BrowserMicrophone(tone.stream);
    const raw = new LevelMeter(tone.stream);

    microphone.setGain(doubled);
    const raised = new LevelMeter(microphone.stream);
    await waitFor(() => expect(reads(raised, raw, true)).toBe(true));

    microphone.setGain(halved);
    await waitFor(() => expect(reads(raised, raw, false)).toBe(true));

    microphone.setMuted(true);
    await waitFor(() => expect(raised.level()).toBeLessThan(nearSilence));

    raised.close();
    raw.close();
    microphone.stop();
    tone.stop();
  },
};
