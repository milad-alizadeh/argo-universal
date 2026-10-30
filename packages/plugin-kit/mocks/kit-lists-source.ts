// A Plugin mounted through the kit the way a real one is: the page registers, the Engine draws it, a dispatch patches it.
export const kitListsSource = `import { Action, Image, List, ListItem, Screen, Svg, Text, applyListMove, useEffect, useState } from '@argo/plugin-kit';

const xml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 9L10 1" stroke="currentColor" fill="none"/></svg>';

function Gallery({ assets }) {
  const [picture, setPicture] = useState();
  const [selected, select] = useState('');
  useEffect(() => {
    void assets.resolve({ asset: 'assets/poster.jpeg' }).then((asset) => setPicture(asset));
  }, []);
  return (
    <Screen title="Gallery">
      <List
        direction="horizontal"
        tileSize="md"
        aspect="landscape"
        items={['Overview', 'Checkout']}
        renderItem={(title) => <ListItem key={title} title={title} media={<Image source={picture} accessibilityLabel={title + ' preview'} />} />}
      />
      <List
        layout="grid"
        columns="auto"
        tileSize="sm"
        aspect="landscape"
        items={[{ id: '1', title: 'Metric 1' }, { id: '2', title: 'Metric 2' }]}
        renderItem={(metric) => <ListItem key={metric.id} title={metric.title} media={<Svg xml={xml} label={metric.title + ' trend'} />} selected={metric.id === selected} onPress={() => select(metric.id)} />}
      />
    </Screen>
  );
}

const lanes = [
  { id: 'todo', title: 'To do', rows: [{ id: 'login', title: 'Fix login' }, { id: 'docs', title: 'Write docs' }] },
  { id: 'done', title: 'Done', rows: [] },
];

function Board() {
  const [current, setLanes] = useState(lanes);
  return (
    <Screen title="Card lanes">
      <List accessibilityLabel="Board" layout="lanes" appearance="cards" onMove={(move) => setLanes(applyListMove(current, move))}>
        {current.map((lane) => (
          <List.Section key={lane.id} id={lane.id} title={lane.title}>
            {lane.rows.map((card) => <ListItem key={card.id} id={card.id} title={card.title} />)}
          </List.Section>
        ))}
      </List>
    </Screen>
  );
}

function Log() {
  const [lines, setLines] = useState(Array.from({ length: 80 }, (_, index) => 'Line ' + (index + 1)));
  const append = () => setLines([...lines, 'Line ' + (lines.length + 1)]);
  return (
    <Screen title="Log" actions={<Action label="Append line" icon="add" onPress={append} />}>
      <List anchor="end" items={lines} renderItem={(line) => <Text key={line}>{line}</Text>} />
    </Screen>
  );
}

const rows = (count) => Array.from({ length: count }, (_, index) => ({ id: index + 1, title: 'Post ' + (index + 1) }));

function Paged() {
  const [count, setCount] = useState(3);
  return (
    <Screen title="Paged">
      <List
        accessibilityLabel="Posts"
        items={rows(count)}
        renderItem={(post) => <ListItem key={post.id} id={String(post.id)} title={post.title} />}
        pagination={{ hasMore: count < 6, onLoadMore: () => setCount(count + 3) }}
        isLoading={false}
        empty={<Text>No posts</Text>}
      />
    </Screen>
  );
}

export function register(argo) {
  argo.pages.register('/gallery', () => <Gallery assets={argo.assets} />);
  argo.pages.register('/board', Board);
  argo.pages.register('/log', Log);
  argo.pages.register('/paged', Paged);
}`;
