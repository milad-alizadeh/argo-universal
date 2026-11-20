import { useViewability } from '@legendapp/list/react-native';
import {
  Orb,
  OrbPlaceholder,
  type OrbProps,
} from '@repo/kit/primitives/status/orb';
import { createContext, type ReactElement, useContext, useState } from 'react';

export const feedOrbViewability = {
  id: 'feed-orb',
  itemVisiblePercentThreshold: 0,
};

export const ObserveFeedOrbs = createContext(false);

// A buffered iOS row can wait on a Metal drawable for a full second after leaving the viewport.
function ViewableOrb(props: OrbProps): ReactElement {
  const [visible, setVisible] = useState(false);
  useViewability(
    ({ isViewable }) => setVisible(isViewable),
    feedOrbViewability.id,
  );

  return visible ? <Orb {...props} /> : <OrbPlaceholder size={props.size} />;
}

export function FeedOrb(props: OrbProps): ReactElement {
  return useContext(ObserveFeedOrbs) ? (
    <ViewableOrb {...props} />
  ) : (
    <Orb {...props} />
  );
}
