import Foundation

/// The channel's outer WebSocket on URLSessionWebSocketTask. It reports each binary message and the close; ChannelSession does the rest.
final class ChannelSocket: NSObject, URLSessionWebSocketDelegate {
  var onMessage: ((Data) -> Void)?
  var onClose: ((_ code: Int, _ reason: String, _ error: String?) -> Void)?

  private let url: URL
  private var session: URLSession?
  private var task: URLSessionWebSocketTask?
  private var opening: CheckedContinuation<Void, Error>?
  private let lock = NSLock()
  private var closed = false

  init(url: URL) {
    self.url = url
  }

  /// Resolves when the socket is open, or throws when it fails or the time is up.
  func open(timeout: TimeInterval) async throws {
    let configuration = URLSessionConfiguration.default
    configuration.timeoutIntervalForRequest = timeout
    let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    let task = session.webSocketTask(with: url)
    self.session = session
    self.task = task
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      lock.lock()
      opening = continuation
      lock.unlock()
      task.resume()
    }
    receive()
  }

  func send(_ data: Data) {
    task?.send(.data(data)) { [weak self] error in
      if let error { self?.finish(code: 1006, reason: "", error: error.localizedDescription) }
    }
  }

  func close() {
    task?.cancel(with: .normalClosure, reason: nil)
  }

  private func receive() {
    task?.receive { [weak self] result in
      switch result {
      case .success(.data(let data)):
        self?.onMessage?(data)
        self?.receive()
      case .success:
        self?.receive()
      case .failure(let error):
        self?.finish(code: 1006, reason: "", error: error.localizedDescription)
      }
    }
  }

  private func settleOpening(_ error: Error?) {
    lock.lock()
    let continuation = opening
    opening = nil
    lock.unlock()
    if let error { continuation?.resume(throwing: error) } else { continuation?.resume() }
  }

  private func finish(code: Int, reason: String, error: String?) {
    lock.lock()
    let first = !closed
    closed = true
    lock.unlock()
    guard first else { return }
    session?.invalidateAndCancel()
    onClose?(code, reason, error)
  }

  func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
    settleOpening(nil)
  }

  func urlSession(
    _ session: URLSession, webSocketTask: URLSessionWebSocketTask,
    didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?
  ) {
    finish(code: closeCode.rawValue, reason: reason.map { String(decoding: $0, as: UTF8.self) } ?? "", error: nil)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    settleOpening(error ?? URLError(.cannotConnectToHost))
    finish(code: 1006, reason: "", error: error?.localizedDescription)
  }
}
