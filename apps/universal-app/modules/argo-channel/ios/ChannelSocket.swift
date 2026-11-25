import Foundation

/// The channel's outer WebSocket on URLSessionWebSocketTask. It reports each binary message and the close; ChannelSession does the rest.
final class ChannelSocket: NSObject, URLSessionWebSocketDelegate {
  var onMessage: ((Data) -> Void)?
  var onClose: ((_ code: Int, _ reason: String, _ error: String?) -> Void)?

  private let url: URL
  private let headers: [String: String]
  private var session: URLSession?
  private var task: URLSessionWebSocketTask?
  private var opening: CheckedContinuation<Void, Error>?
  private let lock = NSLock()
  private var opened = false
  private var closed = false

  /// `headers` ride on the WebSocket upgrade request, which is where the App offers compression: a Server built before it never reads them.
  init(url: URL, headers: [String: String] = [:]) {
    self.url = url
    self.headers = headers
  }

  /// Resolves when the socket is open, or throws when it fails or has not opened within `timeout`. The session keeps its default timeouts, so an idle open channel is not dropped.
  func open(timeout: TimeInterval) async throws {
    let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    var request = URLRequest(url: url)
    for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
    let task = session.webSocketTask(with: request)
    self.session = session
    self.task = task
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      lock.lock()
      opening = continuation
      lock.unlock()
      task.resume()
      DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { [weak self] in
        guard let self, !self.hasOpened() else { return }
        self.settleOpening(URLError(.timedOut))
        task.cancel(with: .goingAway, reason: nil)
      }
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

  private func hasOpened() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return opened
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

  /// Ends the socket once, tells the owner, and lets go of its closures so nothing keeps the owner alive.
  private func finish(code: Int, reason: String, error: String?) {
    lock.lock()
    let first = !closed
    closed = true
    lock.unlock()
    guard first else { return }
    session?.invalidateAndCancel()
    let notify = onClose
    onMessage = nil
    onClose = nil
    notify?(code, reason, error)
  }

  func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
    lock.lock()
    opened = true
    lock.unlock()
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
