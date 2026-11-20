import type { FaderProps } from './fader-props';

type FaderFixture = Omit<FaderProps, 'onValueChange' | 'children'>;

const level = {
  minimumValue: 0,
  maximumValue: 100,
  step: 1,
  accessibilityLabel: 'Level',
};

// Colours that are data, as a Plugin sends them: the fill takes them as given in light and dark mode. The first colour is where the fill starts, so a vertical one lists its darker end first.
export const warmFill = ['#FF8A3D', '#FFD08A'];

export const verticalFader = {
  ...level,
  value: 80,
  valueLabel: '80%',
  orientation: 'vertical',
  fill: warmFill,
} satisfies FaderFixture;

export const horizontalFader = {
  ...level,
  value: 70,
  valueLabel: '70%',
  orientation: 'horizontal',
  fill: ['#E8EEFF', '#C9D6FF'],
} satisfies FaderFixture;

export const noFillFader = {
  ...level,
  value: 60,
  valueLabel: '60%',
} satisfies FaderFixture;

export const disabledFader = {
  ...verticalFader,
  disabled: true,
} satisfies FaderFixture;

export interface TileFixture {
  id: string;
  title: string;
  detail: string;
  value: number;
  fill?: string[];
}

// Five tiles, a row of a wide window's grid: warm, cool and magenta ones, a full one, and one at zero with no colour.
export const tileFixtures: TileFixture[] = [
  {
    id: 'warm',
    title: 'Ceiling',
    detail: 'Warm · 2700 K',
    value: 80,
    fill: warmFill,
  },
  {
    id: 'cool',
    title: 'Desk',
    detail: 'Cool white · 5000 K',
    value: 55,
    fill: ['#C9D6FF', '#E8EEFF'],
  },
  {
    id: 'magenta',
    title: 'Shelf',
    detail: 'Magenta',
    value: 35,
    fill: ['#8A5CFF', '#EE5FA8'],
  },
  {
    id: 'amber',
    title: 'Floor',
    detail: 'Warm · 2400 K',
    value: 100,
    fill: ['#FF7A3D', '#FFC46B'],
  },
  { id: 'off', title: 'Window', detail: 'Was 70%', value: 0 },
];
