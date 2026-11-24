import Foundation
import Network

/// The channel's outer WebSocket on Network.framework, which App Transport Security does not police, as the React Native WebSocket it replaces is not. It reports each binary message and the close; ChannelSession does the rest.
final class ChannelSocket {
  var onMessage: ((Data) -> Void)?
  var onClose: ((_ code: Int, _ reason: String, _ error: String?) -> Void)?

  private let connection: NWConnection
  private let queue = DispatchQueue(label: "dev.argo.channel.socket")
  private var closed = false
  private var ready = false

  init(url: URL) {
    let options = NWProtocolWebSocket.Options()
    let parameters = NWParameters(tls: nil)
    parameters.defaultProtocolStack.applicationProtocols.insert(options, at: 0)
    connection = NWConnection(to: .url(url), using: parameters)
  }

  /// Resolves when the socket is ready, or throws when it fails or the time is up.
  func open(timeout: TimeInterval) async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      var settled = false
      let settle: (Error?) -> Void = { error in
        self.queue.async {
          guard !settled else { return }
          settled = true
          if let error { continuation.resume(throwing: error) } else { continuation.resume() }
        }
      }
      connection.stateUpdateHandler = { [weak self] state in
        switch state {
        case .ready:
          self?.ready = true
          settle(nil)
          self?.receive()
        case .failed(let error):
          settle(error)
          self?.finish(code: 1006, reason: "", error: error.localizedDescription)
        case .cancelled:
          settle(URLError(.cancelled))
          self?.finish(code: 1006, reason: "", error: nil)
        default:
          break
        }
      }
      connection.start(queue: queue)
      queue.asyncAfter(deadline: .now() + timeout) {
        guard !self.ready else { return }
        settle(URLError(.timedOut))
        self.connection.cancel()
      }
    }
  }

  func send(_ data: Data) {
    let metadata = NWProtocolWebSocket.Metadata(opcode: .binary)
    let context = NWConnection.ContentContext(identifier: "record", metadata: [metadata])
    connection.send(content: data, contentContext: context, isComplete: true, completion: .contentProcessed { [weak self] error in
      if let error { self?.finish(code: 1006, reason: "", error: error.localizedDescription) }
    })
  }

  func close() {
    connection.cancel()
  }

  private func receive() {
    connection.receiveMessage { [weak self] data, context, _, error in
      guard let self else { return }
      if let error {
        finish(code: 1006, reason: "", error: error.localizedDescription)
        return
      }
      let metadata = context?.protocolMetadata(definition: NWProtocolWebSocket.definition) as? NWProtocolWebSocket.Metadata
      if metadata?.opcode == .close {
        finish(code: Int(metadata?.closeCode.rawValue ?? 1005), reason: "", error: nil)
        return
      }
      if let data, !data.isEmpty { onMessage?(data) }
      receive()
    }
  }

  private func finish(code: Int, reason: String, error: String?) {
    queue.async {
      guard !self.closed else { return }
      self.closed = true
      self.connection.cancel()
      self.onClose?(code, reason, error)
    }
  }
}
