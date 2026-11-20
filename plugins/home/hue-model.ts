import type { HueResource } from './hue';

// What the Home page shows: each room with its own switch and its lights, then the lights in no room.
export type Switchable = Exclude<HueResource, 'room'>;

export type Switch = Readonly<{
  kind: Switchable;
  id: string;
  name: string;
  on: boolean;
  brightness: number;
}>;

export type Room = Readonly<{
  id: string;
  name: string;
  group: Switch | null;
  lights: readonly Switch[];
}>;

export type Household = Readonly<{
  rooms: readonly Room[];
  others: readonly Switch[];
}>;

// The page's one read: the household, the Bridge still to connect, or why Hue could not be read.
export type HomeData =
  | { kind: 'home'; household: Household }
  | { kind: 'connect' }
  | { kind: 'failed'; reason: string };
