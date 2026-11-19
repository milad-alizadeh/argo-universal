import {
  Button,
  Pill,
  Stack,
  Spacer,
  Surface,
  Text,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { period, type Pace } from './pace-data';
import { days, dayMs } from './pace-metrics';
import { root } from './pace-picker';

export type Filters = { previous: boolean; choosingWeek: boolean };

type To = PageTo<Filters>;

export const initial: Filters = { previous: false, choosingWeek: false };

function repoPill(data: Pace, to: To): JSX.Element {
  const repository = data.target.repository;
  const name = repository.split('/').pop() ?? repository;

  return (
    <Pill
      variant="control"
      text={name}
      disclosure="down"
      accessibilityLabel={`Choose repository, ${repository}`}
      onPress={to.go(root)}
    />
  );
}

function weekPill(data: Pace, state: Filters, to: To): JSX.Element {
  const props = {
    text: period(data.target.start),
    onPress: to.set({ choosingWeek: !state.choosingWeek }),
  };

  return (
    <Pill
      {...props}
      variant="control"
      disclosure={state.choosingWeek ? 'up' : 'down'}
      accessibilityLabel="Choose week"
    />
  );
}

function choice(start: number, previous: boolean, to: To): JSX.Element {
  const onPress = to.set({ previous, choosingWeek: false });

  return (
    <Button
      variant="secondary"
      size="sm"
      label={period(start)}
      onPress={onPress}
    />
  );
}

function weekChoices(start: number, to: To): JSX.Element {
  return (
    <Stack direction="row" gap={2}>
      {choice(start, false, to)}
      {choice(start - days * dayMs, true, to)}
    </Stack>
  );
}

const snapshotDate = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function status(data: Pace, state: Filters): JSX.Element {
  const label = state.previous ? data.branch : `${data.branch} · partial`;

  return (
    <Stack direction="row" align="center" gap={2}>
      <Text role="secondary" tone="muted">
        {label}
      </Text>
      <Spacer />
      <Text
        role="secondary"
        tone="muted"
      >{`${snapshotDate.format(data.snapshot)} · UTC snapshot`}</Text>
    </Stack>
  );
}

function toolbar(data: Pace, state: Filters, to: To): JSX.Element {
  return (
    <Stack direction="row" gap={2} align="center">
      {repoPill(data, to)}
      {weekPill(data, state, to)}
    </Stack>
  );
}

function filterBar(data: Pace, state: Filters, to: To): JSX.Element {
  const start = data.target.start + (state.previous ? days * dayMs : 0);

  return (
    <Surface kind="muted" padding={2}>
      <Stack direction="column" gap={2}>
        {toolbar(data, state, to)}
        {state.choosingWeek && weekChoices(start, to)}
      </Stack>
    </Surface>
  );
}

export function controls(data: Pace, state: Filters, to: To): JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      {filterBar(data, state, to)}
      {status(data, state)}
    </Stack>
  );
}
