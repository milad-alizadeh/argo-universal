import type { AudioPlayer } from 'expo-audio';

let current: AudioPlayer | null = null;

// One clip plays at a time: starting one pauses the clip already playing.
export function playOnly(player: AudioPlayer): void {
  if (current && current !== player) current.pause();
  current = player;
  player.play();
}

export function forget(player: AudioPlayer): void {
  if (current === player) current = null;
}
