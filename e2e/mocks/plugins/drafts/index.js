import { EmptyState, Stack, Text } from '@argo/plugin-kit';

// The canned answer of each state the Draft draws; a Draft Loader reads no real data.
const answers = {
  loading: { title: 'Loading draft' },
  empty: { title: 'Nothing here yet' },
  populated: { title: 'Draft issues' },
};

const draw = (answer) =>
  answer.title === answers.empty.title ? (
    <EmptyState title={answer.title} description="No issues in this draft." />
  ) : (
    <Stack direction="column">
      <Text>{answer.title}</Text>
    </Stack>
  );

export function register(argo) {
  argo.pages.define('/', {
    state: { draftState: 'populated' },
    load: ({ state }) => answers[state.draftState] ?? answers.populated,
    render: draw,
  });
}
