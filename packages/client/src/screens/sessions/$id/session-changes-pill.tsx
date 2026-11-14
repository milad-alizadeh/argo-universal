import type * as React from 'react';
import { ChangesPill, hasChanges } from '#features/changes';
import { Feed } from '#features/feed';
import type { SessionPanels } from '#features/sessions';
import { ComposerPillLayer } from '#lib/product/composer-pill-layer';
import { summaryOf } from './sections/changes-facts';
import type { OpenSessionViewProps } from './session-detail-view';

// A preview has no Composer to sit above, and an archived Session takes no more turns.
const hasComposer = (props: OpenSessionViewProps): boolean =>
  !props.preview && !props.archived;

// Nothing without a Composer, or while the Checkout has no changes.
const changesPill = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): React.ReactNode => {
  const summary = summaryOf(props);

  if (!hasComposer(props) || !hasChanges(summary)) return null;

  return (
    <ChangesPill summary={summary} onPress={() => panels.select('changes')} />
  );
};

// The Feed, with the Composer's Changes pill laid over its end: it opens the Inspector's Changes tab, or on a phone the Changes sheet.
export const sessionFeed = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): React.JSX.Element => (
  <ComposerPillLayer pill={changesPill(props, panels)}>
    <Feed {...props.feed} />
  </ComposerPillLayer>
);
