import type { Gamut } from './hue-colour';

// What the Home page shows: each room with its own switch and its lights, then the lights in no room.
export type Switchable = 'light' | 'grouped_light';

// A light's colour on the wheel, with the gamut its colours must stay within.
export type LightColour = Readonly<{
  hue: number;
  saturation: number;
  gamut: Gamut;
}>;

export type Switch = Readonly<{
  kind: Switchable;
  id: string;
  name: string;
  on: boolean;
  brightness: number;
  // Null for a room's grouped light and for a white-only light, which shows no colour.
  colour: LightColour | null;
  // Whether the Bridge reaches it; a room's grouped light always is.
  reachable: boolean;
}>;

// A room's scene: the colours it carries as hex, and whether it is the one the room is in.
export type Scene = Readonly<{
  id: string;
  name: string;
  colours: readonly string[];
  active: boolean;
}>;

export type Room = Readonly<{
  id: string;
  name: string;
  group: Switch | null;
  lights: readonly Switch[];
  scenes: readonly Scene[];
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
