import Compression
import CryptoKit
import Foundation

// The channel's record path, with no sockets and no Expo in it, so it can be read and tested on its own (ADR-0045).
// What arrives is one pipeline: outer WebSocket message -> records (two-byte length) -> decrypt -> inner HTTP upgrade and WebSocket frames -> message strings.
// Once the Server has agreed to compress (ADR-0045), every record opens with a byte: 0 for the bytes as they are, 1 for raw deflate. Receiving inflates; what this side sends is always as it is.

enum ChannelError: Error, Equatable {
  case authentication
  case upgradeRefused(String)
  case malformed(String)
}

private let tagBytes = 16
private let maxRecordBytes = 65_535
private let maxFrameBytes = 1 << 30
// With the leading byte, a record holds one byte less of message.
private let maxMessageBytes = maxRecordBytes - tagBytes - 1

/// The leading byte of a record, undone: raw deflate is inflated by Apple's Compression framework, whose `COMPRESSION_ZLIB` is raw deflate (RFC 1951). A record never holds more than `maxMessageBytes` of message, so the output buffer is one byte larger and anything that fills it is refused rather than inflated.
func unpack(_ record: Data) throws -> Data {
  guard let lead = record.first else { throw ChannelError.malformed("compressed record") }
  let body = record.dropFirst()
  switch lead {
  case 0:
    return Data(body)
  case 1:
    let capacity = maxMessageBytes + 1
    let output = UnsafeMutablePointer<UInt8>.allocate(capacity: capacity)
    defer { output.deallocate() }
    let size = body.withUnsafeBytes { (input: UnsafeRawBufferPointer) -> Int in
      guard let base = input.bindMemory(to: UInt8.self).baseAddress else { return 0 }
      return compression_decode_buffer(output, capacity, base, body.count, nil, COMPRESSION_ZLIB)
    }
    guard size > 0, size <= maxMessageBytes else { throw ChannelError.malformed("compressed record") }
    return Data(bytes: output, count: size)
  default:
    throw ChannelError.malformed("compressed record")
  }
}

/// A byte queue that reads from the front without copying what is left, so a long stream is read in linear time.
struct ByteQueue {
  private var storage = Data()
  private var head = 0

  var count: Int { storage.count - head }

  mutating func append(_ data: Data) {
    storage.append(data)
  }

  func byte(at index: Int) -> UInt8 {
    storage[storage.startIndex + head + index]
  }

  mutating func take(_ length: Int) -> Data {
    let start = storage.startIndex + head
    let taken = Data(storage[start..<start + length])
    head += length
    if head > 4096 && head * 2 > storage.count {
      storage = Data(storage[(storage.startIndex + head)...])
      head = 0
    }
    return taken
  }
}

/// One direction of the channel: a key and a record number, counted from the number JavaScript's handshake reached. The number is not on the wire.
struct RecordCipher {
  private let key: SymmetricKey
  private var records: UInt64

  init(key: Data, records: UInt64) {
    self.key = SymmetricKey(data: key)
    self.records = records
  }

  private mutating func nextNonce() throws -> ChaChaPoly.Nonce {
    var bytes = Data(count: 12)
    var counter = records.littleEndian
    bytes.replaceSubrange(4..<12, with: Data(bytes: &counter, count: 8))
    records += 1
    return try ChaChaPoly.Nonce(data: bytes)
  }

  mutating func open(_ record: Data) throws -> Data {
    guard record.count >= tagBytes else { throw ChannelError.authentication }
    let nonce = try nextNonce()
    do {
      let box = try ChaChaPoly.SealedBox(
        nonce: nonce, ciphertext: record.prefix(record.count - tagBytes), tag: record.suffix(tagBytes))
      return try ChaChaPoly.open(box, using: key)
    } catch {
      throw ChannelError.authentication
    }
  }

  mutating func seal(_ plaintext: Data) throws -> Data {
    let box = try ChaChaPoly.seal(plaintext, using: key, nonce: try nextNonce())
    return box.ciphertext + box.tag
  }
}

/// Records come out of the byte stream by the two-byte length that precedes each.
struct RecordReader {
  private var pending = ByteQueue()

  mutating func push(_ chunk: Data) -> [Data] {
    pending.append(chunk)
    var records: [Data] = []
    while pending.count >= 2 {
      let length = Int(pending.byte(at: 0)) << 8 | Int(pending.byte(at: 1))
      guard pending.count >= 2 + length else { break }
      _ = pending.take(2)
      records.append(pending.take(length))
    }
    return records
  }
}

enum InnerEvent: Equatable {
  case open
  case message(String)
  case close(code: Int, reason: String)
}

private let headEnd: [UInt8] = Array("\r\n\r\n".utf8)

/// The plaintext inside the channel: the Server's answer to the WebSocket upgrade, then RFC 6455 frames. Control frames are answered here; text and binary frames, however split, are one message.
struct InnerStream {
  private let accept: String
  private var queue = ByteQueue()
  private var upgraded = false
  private var fragments = Data()

  init(accept: String) {
    self.accept = accept
  }

  struct Output {
    var events: [InnerEvent] = []
    // Frames to send back: the pong for a ping, the echo of a close.
    var replies: [(opcode: UInt8, payload: Data)] = []
  }

  mutating func push(_ chunk: Data) throws -> Output {
    queue.append(chunk)
    var output = Output()
    if !upgraded {
      guard let end = headLength() else { return output }
      try checkUpgrade(String(decoding: queue.take(end), as: UTF8.self))
      upgraded = true
      output.events.append(.open)
    }
    while let frame = try takeFrame() {
      handle(frame, into: &output)
    }
    return output
  }

  // How many bytes the head takes, through its blank line, once all of it is here.
  private func headLength() -> Int? {
    guard queue.count >= headEnd.count else { return nil }
    for start in 0...(queue.count - headEnd.count) {
      if headEnd.indices.allSatisfy({ queue.byte(at: start + $0) == headEnd[$0] }) {
        return start + headEnd.count
      }
    }
    return nil
  }

  private func checkUpgrade(_ head: String) throws {
    let lines = head.components(separatedBy: "\r\n")
    guard lines.first?.split(separator: " ").dropFirst().first == "101" else {
      throw ChannelError.upgradeRefused(lines.first ?? "")
    }
    let answered = lines.dropFirst().first { $0.lowercased().hasPrefix("sec-websocket-accept:") }
    let value = answered.map { String($0.drop { $0 != ":" }.dropFirst()).trimmingCharacters(in: .whitespaces) }
    guard value == accept else { throw ChannelError.upgradeRefused("bad accept") }
  }

  private struct Frame {
    let fin: Bool
    let opcode: UInt8
    let payload: Data
  }

  // Reads only the header to learn the frame's length, then takes the frame once all of it is here.
  private mutating func takeFrame() throws -> Frame? {
    guard queue.count >= 2 else { return nil }
    let masked = queue.byte(at: 1) & 0x80 != 0
    var length = Int(queue.byte(at: 1) & 0x7f)
    var at = 2
    if length == 126 {
      guard queue.count >= 4 else { return nil }
      length = Int(queue.byte(at: 2)) << 8 | Int(queue.byte(at: 3))
      at = 4
    } else if length == 127 {
      guard queue.count >= 10 else { return nil }
      var wide: UInt64 = 0
      for index in 2..<10 { wide = wide << 8 | UInt64(queue.byte(at: index)) }
      guard wide <= UInt64(maxFrameBytes) else { throw ChannelError.malformed("frame length") }
      length = Int(wide)
      at = 10
    }
    let maskAt = at
    if masked { at += 4 }
    guard queue.count >= at + length else { return nil }
    let mask = masked ? (0..<4).map { queue.byte(at: maskAt + $0) } : []
    let first = queue.byte(at: 0)
    var payload = Array(queue.take(at + length).dropFirst(at))
    if masked { for index in payload.indices { payload[index] ^= mask[index % 4] } }
    return Frame(fin: first & 0x80 != 0, opcode: first & 0x0f, payload: Data(payload))
  }

  private mutating func handle(_ frame: Frame, into output: inout Output) {
    switch frame.opcode {
    case 9:
      output.replies.append((opcode: 10, payload: frame.payload))
    case 10:
      break
    case 8:
      let bytes = [UInt8](frame.payload)
      let code = bytes.count >= 2 ? Int(bytes[0]) << 8 | Int(bytes[1]) : 1005
      output.replies.append((opcode: 8, payload: frame.payload))
      output.events.append(.close(code: code, reason: String(decoding: bytes.dropFirst(2), as: UTF8.self)))
    default:
      fragments.append(frame.payload)
      if frame.fin {
        output.events.append(.message(String(decoding: fragments, as: UTF8.self)))
        fragments = Data()
      }
    }
  }
}

/// A client's frame: masked, as RFC 6455 says a client's always are.
func clientFrame(opcode: UInt8, payload: Data, mask: [UInt8]) -> Data {
  var frame = Data([0x80 | opcode])
  let length = payload.count
  if length <= 125 {
    frame.append(0x80 | UInt8(length))
  } else if length <= 65_535 {
    frame.append(contentsOf: [0x80 | 126, UInt8(length >> 8), UInt8(length & 0xff)])
  } else {
    frame.append(0x80 | 127)
    for shift in stride(from: 56, through: 0, by: -8) { frame.append(UInt8((length >> shift) & 0xff)) }
  }
  frame.append(contentsOf: mask)
  frame.append(contentsOf: payload.enumerated().map { $0.element ^ mask[$0.offset % 4] })
  return frame
}

/// Everything a handed-over channel does, as data in and data out. The socket code feeds it outer messages; what it has to send goes to `deliver`.
/// The two ciphers count records, so every call that touches them runs under one lock, and each sealed record is handed to `deliver` inside that lock: a receive, a send and a close never interleave, no record number is reused or skipped, and records reach the socket in the order they were numbered. `deliver` must only enqueue (as `URLSessionWebSocketTask.send` does).
final class ChannelSession {
  private let lock = NSLock()
  private var sending: RecordCipher
  private var receiving: RecordCipher
  private var reader = RecordReader()
  private var inner: InnerStream
  private let upgrade: String
  private let compression: Bool
  private let deliver: (Data) -> Void
  private let randomMask: () -> [UInt8]

  init(
    sendKey: Data, sendRecords: UInt64, receiveKey: Data, receiveRecords: UInt64,
    upgrade: String, accept: String, compression: Bool = false,
    deliver: @escaping (Data) -> Void,
    randomMask: @escaping () -> [UInt8] = ChannelSession.secureMask
  ) {
    sending = RecordCipher(key: sendKey, records: sendRecords)
    receiving = RecordCipher(key: receiveKey, records: receiveRecords)
    inner = InnerStream(accept: accept)
    self.upgrade = upgrade
    self.compression = compression
    self.deliver = deliver
    self.randomMask = randomMask
  }

  static func secureMask() -> [UInt8] {
    var mask = [UInt8](repeating: 0, count: 4)
    _ = SecRandomCopyBytes(kSecRandomDefault, 4, &mask)
    return mask
  }

  /// Sends the upgrade request, sealed.
  func start() throws {
    lock.lock()
    defer { lock.unlock() }
    try send(bytes: Data(upgrade.utf8))
  }

  /// One outer message in: the events it completes. What the Server must be sent in answer (a pong, the echo of a close) is delivered.
  func receive(_ outer: Data) throws -> [InnerEvent] {
    lock.lock()
    defer { lock.unlock() }
    var events: [InnerEvent] = []
    for record in reader.push(outer) {
      let opened = try receiving.open(record)
      let output = try inner.push(compression ? try unpack(opened) : opened)
      events += output.events
      for reply in output.replies {
        try send(bytes: clientFrame(opcode: reply.opcode, payload: reply.payload, mask: randomMask()))
      }
    }
    return events
  }

  func send(message: String) throws {
    lock.lock()
    defer { lock.unlock() }
    try send(bytes: clientFrame(opcode: 1, payload: Data(message.utf8), mask: randomMask()))
  }

  func close(code: Int, reason: String) throws {
    lock.lock()
    defer { lock.unlock() }
    let payload = Data([UInt8(code >> 8), UInt8(code & 0xff)]) + Data(reason.utf8)
    try send(bytes: clientFrame(opcode: 8, payload: payload, mask: randomMask()))
  }

  // Each message becomes one record when it fits, which is nearly always; a larger one is cut into records the Server reads back in order. Called with the lock held.
  private func send(bytes: Data) throws {
    let largest = compression ? maxMessageBytes : maxRecordBytes - tagBytes
    var start = bytes.startIndex
    repeat {
      let end = min(start + largest, bytes.endIndex)
      let piece = Data(bytes[start..<end])
      let sealed = try sending.seal(compression ? Data([0]) + piece : piece)
      deliver(Data([UInt8(sealed.count >> 8), UInt8(sealed.count & 0xff)]) + sealed)
      start = end
    } while start < bytes.endIndex
  }
}
