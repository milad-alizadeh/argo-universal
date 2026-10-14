import type * as React from 'react';
import { Linking } from 'react-native';
import { ListItem } from '#lib/generic/primitives/lists/list-item/list-item';
import {
  homebrewUrl,
  type ToolFacts,
  type ToolInstallPresentation,
} from '../../state/missing-tool';

// Without Homebrew: the tool's official download, Homebrew's own page, and Recheck once installed.
export function ToolDownloads(props: {
  facts: ToolFacts;
  tool?: ToolInstallPresentation;
}): React.JSX.Element {
  return (
    <>
      <DownloadLink
        title={`Download ${props.facts.name}`}
        url={props.facts.url}
      />
      <DownloadLink title="Get Homebrew" url={homebrewUrl} />
      {props.tool ? <ToolRecheck tool={props.tool} /> : null}
    </>
  );
}

// Opens outside the App.
function DownloadLink(props: {
  title: string;
  url: string;
}): React.JSX.Element {
  return (
    <ListItem
      tone="accent"
      title={props.title}
      href={props.url}
      onPress={() => void Linking.openURL(props.url)}
    />
  );
}

// A quiet action: looks for the tools again in place.
function ToolRecheck({
  tool,
}: {
  tool: ToolInstallPresentation;
}): React.JSX.Element {
  return (
    <ListItem
      role="button"
      title="Recheck"
      disabled={tool.rechecking}
      onPress={tool.onRecheck}
    />
  );
}
