import type { Microphone } from '../types/conversation-environment';

const iceGatheringLimitMs = 3000;

interface OfferPeer<Offer> {
  iceGatheringState: string;
  localDescription: { sdp?: string | null } | null;
  createDataChannel: (label: string) => object;
  createOffer: () => Promise<Offer>;
  setLocalDescription: (offer: Offer) => Promise<void>;
  addEventListener: (
    type: 'icegatheringstatechange',
    listener: () => void,
  ) => void;
}

// The provider receives the offer once its candidates are gathered or the wait expires.
export async function offerWithCandidates<Offer>(
  peer: OfferPeer<Offer>,
): Promise<string> {
  peer.createDataChannel('oai-events');
  await peer.setLocalDescription(await peer.createOffer());
  await new Promise<void>((resolve) => {
    const check = (): void => {
      if (peer.iceGatheringState === 'complete') resolve();
    };

    peer.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, iceGatheringLimitMs);
    check();
  });

  return peer.localDescription?.sdp ?? '';
}

interface AudioSender<Track> {
  track: { kind: string } | null;
  replaceTrack: (track: Track | null) => Promise<void>;
}

// Keep the sender in its place in the offer so the microphone can change without renegotiation.
export function microphoneReplacer<Track>(
  peer: { getSenders: () => AudioSender<Track>[] },
  streamOf: (microphone: Microphone) => { getAudioTracks: () => Track[] },
): (microphone: Microphone) => Promise<void> {
  return async (microphone) => {
    const [track] = streamOf(microphone).getAudioTracks();

    const sender = peer
      .getSenders()
      .find((each) => each.track?.kind === 'audio');

    await sender?.replaceTrack(track ?? null);
  };
}

export function firstVoiceStream<Stream>(
  listener: (voice: Stream) => void,
): (event: { streams: readonly Stream[] }) => void {
  return ({ streams: [voice] }) => {
    if (voice) listener(voice);
  };
}
