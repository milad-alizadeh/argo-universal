import { EmptyState, Spinner, Stack, Text } from '@argo/plugin-kit';

// The canned answer of each state the Draft draws; a Draft Loader reads no real data.
const answers = {
  loading: { label: 'Loading draft' },
  empty: { title: 'Nothing here yet' },
  populated: { title: 'Draft issues' },
};

// One drawing per state, chosen by the state's key.
const drawings = {
  loading: (answer) => <Spinner accessibilityLabel={answer.label} />,
  empty: (answer) => (
    <EmptyState title={answer.title} description="No issues in this draft." />
  ),
  populated: (answer) => (
    <Stack direction="column">
      <Text>{answer.title}</Text>
    </Stack>
  ),
};

// Each region draws the Variant its pick names; the region's node key is the region's id.
const headers = {
  compact: 'Header compact',
  tabs: 'Header tabs',
  search: 'Header search',
};

const lists = { rows: 'List rows', cards: 'List cards' };

// A state with no canned answer fails the draw, so the gap shows instead of another state's page.
function answerFor(state) {
  const answer = answers[state.draftState];

  if (!answer) throw new Error(`The Draft has no ${state.draftState} state`);

  return {
    key: state.draftState,
    answer,
    header: headers[state['draftVariant.header']],
    list: lists[state['draftVariant.list']],
  };
}

export function register(argo) {
  argo.pages.define('/', {
    state: {
      draftState: 'populated',
      'draftVariant.header': 'compact',
      'draftVariant.list': 'rows',
    },
    load: ({ state }) => answerFor(state),
    render: ({ key, answer, header, list }) => (
      <Stack direction="column">
        <Text key="header">{header}</Text>
        {drawings[key](answer)}
        <Text key="list">{list}</Text>
      </Stack>
    ),
  });
}
