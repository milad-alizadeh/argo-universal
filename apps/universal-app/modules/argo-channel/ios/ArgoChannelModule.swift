import ExpoModulesCore

struct HandOverRecord: Record {
  @Field var sendKey: String = ""
  @Field var sendRecords: Double = 0
  @Field var receiveKey: String = ""
  @Field var receiveRecords: Double = 0
  @Field var upgrade: String = ""
  @Field var accept: String = ""
}

/// One socket the module owns. Before the hand-over its bytes go to JavaScript as base64 for the handshake; after it, `session` opens every record and only finished message strings leave.
private final class Channel {
  let socket: ChannelSocket
  private let lock = NSLock()
  private var session: ChannelSession?
  private var listening = false
  private var held: [[String: Any]] = []
  private let emit: ([String: Any]) -> Void

  init(socket: ChannelSocket, emit: @escaping ([String: Any]) -> Void) {
    self.socket = socket
    self.emit = emit
  }

  func listen() {
    lock.lock()
    listening = true
    let waiting = held
    held = []
    lock.unlock()
    waiting.forEach(emit)
  }

  func event(_ event: [String: Any]) {
    lock.lock()
    let now = listening
    if !now { held.append(event) }
    lock.unlock()
    if now { emit(event) }
  }

  func handOver(_ record: HandOverRecord) throws {
    guard let sendKey = Data(base64Encoded: record.sendKey), let receiveKey = Data(base64Encoded: record.receiveKey) else {
      throw ChannelError.malformed("key")
    }
    let session = ChannelSession(
      sendKey: sendKey, sendRecords: UInt64(record.sendRecords),
      receiveKey: receiveKey, receiveRecords: UInt64(record.receiveRecords),
      upgrade: record.upgrade, accept: record.accept)
    lock.lock()
    self.session = session
    lock.unlock()
    try session.start().forEach(socket.send)
  }

  /// A message from the Server's socket: bytes for JavaScript's handshake, or, once handed over, records to open.
  func received(_ outer: Data) {
    lock.lock()
    let session = self.session
    lock.unlock()
    guard let session else {
      event(["type": "bytes", "data": outer.base64EncodedString()])
      return
    }
    do {
      let result = try session.receive(outer)
      result.replies.forEach(socket.send)
      for inner in result.events {
        event(describe(inner))
        if case .close = inner { socket.close() }
      }
    } catch {
      event(["type": "close", "code": 1006, "reason": "", "error": "\(error)"])
      socket.close()
    }
  }

  func send(_ message: String) throws {
    lock.lock()
    defer { lock.unlock() }
    guard let session else { throw ChannelError.malformed("not handed over") }
    try session.send(message: message).forEach(socket.send)
  }

  func close(code: Int, reason: String) {
    lock.lock()
    let session = self.session
    lock.unlock()
    if let frames = try? session?.close(code: code, reason: reason) { frames.forEach(socket.send) }
    socket.close()
  }

  private func describe(_ inner: InnerEvent) -> [String: Any] {
    switch inner {
    case .open: return ["type": "open"]
    case .message(let text): return ["type": "message", "data": text]
    case .close(let code, let reason): return ["type": "close", "code": code, "reason": reason]
    }
  }
}

/// The channel's WebSocket, owned natively (#2704). JavaScript opens the socket and runs the Noise handshake over it, then hands over the session keys; from there this module decrypts each record, decompresses it when the channel does (#2705), and hands JavaScript one message string per event, and does the reverse to send.
public final class ArgoChannelModule: Module {
  private var channels: [String: Channel] = [:]
  private let channelsLock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("ArgoChannel")

    Events("channel")

    AsyncFunction("open") { (url: String, timeoutMs: Double) async throws -> String in
      guard let address = URL(string: url) else { throw ChannelError.malformed("url") }
      let id = UUID().uuidString
      let socket = ChannelSocket(url: address)
      let channel = Channel(socket: socket) { [weak self] event in
        var tagged = event
        tagged["id"] = id
        self?.sendEvent("channel", tagged)
      }
      socket.onMessage = { channel.received($0) }
      socket.onClose = { [weak self] code, reason, error in
        var event: [String: Any] = ["type": "close", "code": code, "reason": reason]
        if let error { event["error"] = error }
        channel.event(event)
        self?.forget(id)
      }
      try await socket.open(timeout: timeoutMs / 1000)
      self.channelsLock.lock()
      self.channels[id] = channel
      self.channelsLock.unlock()
      return id
    }

    Function("listen") { (id: String) in self.channel(id)?.listen() }

    Function("write") { (id: String, base64: String) in
      if let data = Data(base64Encoded: base64) { self.channel(id)?.socket.send(data) }
    }

    Function("handOver") { (id: String, record: HandOverRecord) in
      try self.channel(id)?.handOver(record)
    }

    Function("send") { (id: String, message: String) in
      try self.channel(id)?.send(message)
    }

    Function("close") { (id: String, code: Int, reason: String) in
      self.channel(id)?.close(code: code, reason: reason)
    }
  }

  private func channel(_ id: String) -> Channel? {
    channelsLock.lock()
    defer { channelsLock.unlock() }
    return channels[id]
  }

  private func forget(_ id: String) {
    channelsLock.lock()
    channels[id] = nil
    channelsLock.unlock()
  }
}
