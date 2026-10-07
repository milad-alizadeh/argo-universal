import type {
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Composer, type ComposerDraft } from '#components/Composer';
import { Feed } from '#components/Feed';
import { LoadError } from '#components/LoadError';
import { keyboardAvoidingStyle, Screen } from '#components/Screen';
import { ScrollFade } from '#components/ScrollFade';
import {
  SessionHeader,
  type SessionHeaderStatus,
} from '#components/SessionHeader';
import { useConnectionState } from '../connection/context';
import { useFeedView } from '../feed/use-feed-view';
import { useSessionFeed } from '../feed/use-session-feed';
import { useImageDraft } from '../lib/use-image-draft';
import { useNavigate } from '../navigation/context';
import { useWide } from '../navigation/use-wide';
import { useBlobUrl } from '../trpc/blob-url';
import { useTRPC } from '../trpc/context';

export interface SessionScreenProps {
  id: string;
  // Fixes the clocks, for stories and tests.
  now?: number;
}

const headerStatus = {
  running: 'running',
  requires_action: 'needs_input',
  idle: 'idle',
} satisfies Record<SessionSnapshot['state'], SessionHeaderStatus>;

// The Feed row a `tool_call` live header names.
function findLiveToolCall(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): ToolCallUpdate | undefined {
  const source = snapshot.liveHeader?.source;
  if (source?.type !== 'tool_call') return undefined;
  return rows.findLast(
    (row): row is ToolCallUpdate =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === source.toolCallId,
  );
}

// How far above the Composer the Feed fades out; a phone starts it higher, so the pills above the Composer sit on a quiet surface.
const composerFadeHeight = { phone: 88, wide: 64 };

// One Session: its header, its Feed, and the Composer pinned below. A new id starts every piece of state over.
export function SessionScreen({ id, now }: SessionScreenProps) {
  return <SessionView key={id} sessionId={id} now={now} />;
}

function SessionView({ sessionId, now }: { sessionId: string; now?: number }) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const imageUrl = useBlobUrl();
  const connected = useConnectionState() === 'open';
  const wide = useWide();
  const { feed, snapshot, ready, error, retry, loadingOlder, loadOlder } =
    useSessionFeed(sessionId);
  const agents = useQuery(trpc.agents.list.queryOptions());
  const {
    draft,
    changeDraft,
    attachImages,
    uploadDraftAsPrompt,
    clearDraft,
    imageUpload,
  } = useImageDraft();
  const promptSession = useMutation(
    trpc.session.prompt.mutationOptions({ onSuccess: clearDraft }),
  );
  const cancelTurn = useMutation(trpc.session.cancel.mutationOptions());
  const setConfigOption = useMutation(
    trpc.session.setConfigOption.mutationOptions(),
  );
  const feedView = useFeedView(feed.rows, snapshot);

  async function sendDraft(sent: ComposerDraft) {
    promptSession.reset();
    imageUpload.reset();
    const prompt = await uploadDraftAsPrompt(sent);
    if (prompt?.length) promptSession.mutate({ sessionId, prompt });
  }

  if (error)
    return (
      <Screen edges={['bottom']} className="justify-center">
        <LoadError
          title="Couldn't load the Session"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={() => void retry()}
        />
      </Screen>
    );
  if (!ready || !snapshot || !feedView) return <Screen edges={['bottom']} />;

  const turnRunning = snapshot.state !== 'idle';
  const fadeHeight = wide ? composerFadeHeight.wide : composerFadeHeight.phone;
  const startedAt = snapshot.liveHeader?.startedAt ?? null;
  let sendError: string | undefined;
  if (promptSession.error)
    sendError = `Couldn't send. ${promptSession.error.message}`;
  else if (imageUpload.error)
    sendError = `Couldn't upload the image. ${imageUpload.error.message}`;

  return (
    <Screen edges={['bottom']}>
      <SessionHeader
        title={snapshot.title}
        status={headerStatus[snapshot.state]}
        startedAt={startedAt}
        now={now}
      />
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        // Above an open keyboard the Composer keeps the 16 it has from the screen's sides.
        keyboardVerticalOffset={16}
        style={keyboardAvoidingStyle}
      >
        <Feed
          items={feedView.items}
          liveHeader={snapshot.liveHeader}
          liveToolCall={findLiveToolCall(feed.rows, snapshot)}
          loadingOlder={loadingOlder}
          onStartReached={loadOlder}
          imageUrl={imageUrl}
          checkoutBranch={snapshot.checkout.branch ?? undefined}
          now={now}
        />
        {/* The bottom slot: the Composer until request cards and banners land. */}
        <View className="relative z-10 -mt-12 items-center px-4 wide:px-6 wide:pb-4">
          <View
            pointerEvents="none"
            className="absolute inset-x-0 top-16 bottom-0 bg-card"
          />
          <View
            pointerEvents="none"
            className="absolute inset-x-0 -top-6 wide:top-0"
            style={{ height: fadeHeight }}
          >
            <ScrollFade edge="bottom" className="bg-card" height={fadeHeight} />
          </View>
          <Composer
            draft={draft}
            onDraftChange={changeDraft}
            onAttachImages={() => void attachImages()}
            onSend={(sent) => void sendDraft(sent)}
            onStop={() => cancelTurn.mutate({ sessionId })}
            sending={imageUpload.isPending || promptSession.isPending}
            sendable={connected}
            error={sendError}
            status={
              feedView.plan?.type === 'items'
                ? { plan: feedView.plan.entries }
                : undefined
            }
            configuration={{
              agents: agents.data ?? [],
              agent: snapshot.agent,
              configOptions: snapshot.configOptions,
              onConfigChange: (configId, value) =>
                setConfigOption.mutate(
                  typeof value === 'boolean'
                    ? { sessionId, configId, type: 'boolean', value }
                    : { sessionId, configId, type: 'id', value },
                ),
              onAgentSetup: (setup) =>
                navigate({ to: 'settings-agent', agent: setup }),
              turnRunning,
              checkout: {
                branch: snapshot.checkout.branch ?? '',
                newWorktree: snapshot.checkout.type === 'worktree',
                // A phone draws no checkout row above the Composer.
                path: wide ? snapshot.checkout.path : undefined,
              },
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
