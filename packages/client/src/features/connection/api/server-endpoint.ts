// Where the Server on this Device answers: its loopback address, which the App's own page reaches over the WebSocket it has always used.
export interface LoopbackEndpoint {
  readonly url: string;
}

// A Server this Device paired with. It is reached only inside the encrypted channel, which a Server of another Device is never reached without (ADR-0045).
export interface PairedEndpoint {
  readonly host: string;
  readonly port: number;
  // The Server's static public key as it was paired; a computer that does not hold its private half gets no Connection.
  readonly serverPublicKey: string;
}

export type ServerEndpoint = LoopbackEndpoint | PairedEndpoint;

export const isPaired = (
  endpoint: ServerEndpoint,
): endpoint is PairedEndpoint => 'serverPublicKey' in endpoint;
