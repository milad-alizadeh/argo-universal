import type {
  Microphone,
  VoiceEnvironment,
  VoicePeer,
} from './webrtc-voice-connection';

const iceGatheringLimitMs = 3000;

// The offer is sent whole, so wait for the candidates it carries, or stop waiting after a moment.
function gathered(connection: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      if (connection.iceGatheringState === 'complete') resolve();
    };

    connection.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, iceGatheringLimitMs);
    check();
  });
}

class BrowserMicrophone implements Microphone {
  public constructor(public readonly stream: MediaStream) {}

  public stop(): void {
    for (const track of this.stream.getTracks()) track.stop();
  }
}

function streamOf(microphone: Microphone): MediaStream {
  if (!(microphone instanceof BrowserMicrophone))
    throw new Error('Not a browser microphone.');

  return microphone.stream;
}

const sdpOf = (connection: RTCPeerConnection): string =>
  connection.localDescription?.sdp ?? '';

class BrowserPeer implements VoicePeer {
  private readonly connection = new RTCPeerConnection();

  public async offer(microphone: Microphone): Promise<string> {
    this.sendUp(streamOf(microphone));
    // The provider carries its events on this channel.
    this.connection.createDataChannel('oai-events');
    await this.connection.setLocalDescription(
      await this.connection.createOffer(),
    );
    await gathered(this.connection);

    return sdpOf(this.connection);
  }

  private sendUp(stream: MediaStream): void {
    for (const track of stream.getTracks())
      this.connection.addTrack(track, stream);
  }

  public async accept(answer: string): Promise<void> {
    await this.connection.setRemoteDescription({ type: 'answer', sdp: answer });
  }

  public onVoice(listener: (stream: MediaStream) => void): void {
    this.connection.addEventListener('track', ({ streams }) => {
      const [voice] = streams;

      if (voice) listener(voice);
    });
  }

  public close(): void {
    this.connection.close();
  }
}

async function openMicrophone(): Promise<Microphone> {
  return new BrowserMicrophone(
    await navigator.mediaDevices.getUserMedia({ audio: true }),
  );
}

function playVoice(stream: MediaStream): () => void {
  const audio = new Audio();
  audio.srcObject = stream;
  void audio.play();

  return (): void => {
    audio.pause();
    audio.srcObject = null;
  };
}

// The page's own pieces: the system microphone, a peer connection, and an audio element for the voice.
export const browserVoiceEnvironment: VoiceEnvironment = {
  openMicrophone,
  createPeer: () => new BrowserPeer(),
  playVoice,
};

// Whether this page can carry a call: it has a microphone to ask for and a peer connection to make.
export const browserCarriesAudio = (): boolean =>
  typeof RTCPeerConnection !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices !== undefined;
