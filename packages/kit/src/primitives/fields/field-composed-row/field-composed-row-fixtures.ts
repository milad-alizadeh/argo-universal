// A light's row: its colours are data, so it passes them as stops.
export interface Light {
  id: string;
  name: string;
  detail: string;
  colors?: string[];
  on: boolean;
  // Left out, the light has no slider.
  brightness?: number;
}

export const livingRoom = [
  {
    id: 'all',
    name: 'All lights',
    detail: '4 lights · 3 on',
    colors: ['#FFB45A', '#FF4FA0', '#7A5CFF'],
    on: true,
    brightness: 70,
  },
  {
    id: 'desk',
    name: 'Desk lamp',
    detail: 'Warm · 2700 K',
    colors: ['#FFB45A'],
    on: true,
    brightness: 80,
  },
  {
    id: 'ceiling',
    name: 'Ceiling',
    detail: 'Cool white · 5000 K',
    colors: ['#DCE6FF', '#AFC4FF'],
    on: true,
    brightness: 100,
  },
  {
    id: 'strip',
    name: 'LED strip',
    detail: 'Magenta',
    colors: ['#FF4FA0', '#7A5CFF'],
    on: true,
    brightness: 60,
  },
  { id: 'floor', name: 'Floor lamp', detail: 'Off', on: false },
] satisfies Light[];
