import CryptoKit
import Foundation

// The channel's record path, with no sockets and no Expo in it, so it can be read and run on its own (ADR-0045).
// What arrives is one pipeline: outer WebSocket message -> records (two-byte length) -> decrypt -> PayloadCodec -> inner HTTP upgrade and WebSocket frames -> message strings.

enum ChannelError: Error {
  case authentication
  case upgradeRefused(String)
  case malformed(String)
}

private let tagBytes = 16
private let maxRecordBytes = 65_535

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
    let body = record.prefix(record.count - tagBytes)
    let tag = record.suffix(tagBytes)
    do {
      let box = try ChaChaPoly.SealedBox(nonce: nonce, ciphertext: body, tag: tag)
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

/// What happens to a record's plaintext between the cipher and the inner stream. Today it is nothing. Compression (#2705) is a codec here: `decode` inflates after a record is opened, `encode` deflates before one is sealed, and the pipeline needs no other change.
protocol PayloadCodec {
  func decode(_ plaintext: Data) throws -> Data
  func encode(_ plaintext: Data) throws -> Data
}

struct IdentityCodec: PayloadCodec {
  func decode(_ plaintext: Data) throws -> Data { plaintext }
  func encode(_ plaintext: Data) throws -> Data { plaintext }
}

/// Records come out of the byte stream by the two-byte length that precedes each.
struct RecordReader {
  private var pending = Data()

  mutating func push(_ chunk: Data) -> [Data] {
    pending.append(chunk)
    var records: [Data] = []
    while pending.count >= 2 {
      let length = Int(pending[pending.startIndex]) << 8 | Int(pending[pending.startIndex + 1])
      guard pending.count >= 2 + length else { break }
      records.append(Data(pending.dropFirst(2).prefix(length)))
      pending = Data(pending.dropFirst(2 + length))
    }
    return records
  }
}

enum InnerEvent: Equatable {
  case open
  case message(String)
  case close(code: Int, reason: String)
}

private let headEnd = Data("\r\n\r\n".utf8)

/// The plaintext inside the channel: the Server's answer to the WebSocket upgrade, then RFC 6455 frames. Control frames are answered here; text and binary frames, however split, are one message.
struct InnerStream {
  private let accept: String
  private var buffer = Data()
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
    buffer.append(chunk)
    var output = Output()
    if !upgraded {
      guard let end = buffer.range(of: headEnd) else { return output }
      try checkUpgrade(String(decoding: buffer[buffer.startIndex..<end.lowerBound], as: UTF8.self))
      buffer = Data(buffer[end.upperBound...])
      upgraded = true
      output.events.append(.open)
    }
    while let frame = try takeFrame() {
      handle(frame, into: &output)
    }
    return output
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

  private mutating func takeFrame() throws -> Frame? {
    let bytes = [UInt8](buffer)
    guard bytes.count >= 2 else { return nil }
    let masked = bytes[1] & 0x80 != 0
    var length = Int(bytes[1] & 0x7f)
    var at = 2
    if length == 126 {
      guard bytes.count >= 4 else { return nil }
      length = Int(bytes[2]) << 8 | Int(bytes[3])
      at = 4
    } else if length == 127 {
      guard bytes.count >= 10 else { return nil }
      length = bytes[2..<10].reduce(0) { $0 << 8 | Int($1) }
      at = 10
    }
    let maskAt = at
    if masked { at += 4 }
    guard bytes.count >= at + length else { return nil }
    var payload = Array(bytes[at..<at + length])
    if masked { for index in payload.indices { payload[index] ^= bytes[maskAt + index % 4] } }
    buffer = Data(bytes[(at + length)...])
    return Frame(fin: bytes[0] & 0x80 != 0, opcode: bytes[0] & 0x0f, payload: Data(payload))
  }

  private mutating func handle(_ frame: Frame, into output: inout Output) {
    switch frame.opcode {
    case 9:
      output.replies.append((opcode: 10, payload: frame.payload))
    case 10:
      break
    case 8:
      let code = frame.payload.count >= 2 ? Int(frame.payload[frame.payload.startIndex]) << 8 | Int(frame.payload[frame.payload.startIndex + 1]) : 1005
      let reason = String(decoding: frame.payload.dropFirst(2), as: UTF8.self)
      output.replies.append((opcode: 8, payload: frame.payload))
      output.events.append(.close(code: code, reason: reason))
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

/// Everything a handed-over channel does, as data in and data out. The socket code feeds it outer messages and sends what it returns.
final class ChannelSession {
  private var sending: RecordCipher
  private var receiving: RecordCipher
  private var reader = RecordReader()
  private var inner: InnerStream
  private let upgrade: String
  private let codec: PayloadCodec

  init(
    sendKey: Data, sendRecords: UInt64, receiveKey: Data, receiveRecords: UInt64,
    upgrade: String, accept: String, codec: PayloadCodec = IdentityCodec()
  ) {
    sending = RecordCipher(key: sendKey, records: sendRecords)
    receiving = RecordCipher(key: receiveKey, records: receiveRecords)
    inner = InnerStream(accept: accept)
    self.upgrade = upgrade
    self.codec = codec
  }

  /// The first outer message: the upgrade request, sealed.
  func start() throws -> [Data] {
    try records(of: Data(upgrade.utf8))
  }

  /// One outer message in: the events it completes, and the outer messages to send in answer.
  func receive(_ outer: Data) throws -> (events: [InnerEvent], replies: [Data]) {
    var events: [InnerEvent] = []
    var replies: [Data] = []
    for record in reader.push(outer) {
      let plaintext = try codec.decode(try receiving.open(record))
      let output = try inner.push(plaintext)
      events += output.events
      for reply in output.replies {
        replies += try frames(opcode: reply.opcode, payload: reply.payload)
      }
    }
    return (events, replies)
  }

  func send(message: String) throws -> [Data] {
    try frames(opcode: 1, payload: Data(message.utf8))
  }

  func close(code: Int, reason: String) throws -> [Data] {
    try frames(opcode: 8, payload: Data([UInt8(code >> 8), UInt8(code & 0xff)]) + Data(reason.utf8))
  }

  private func frames(opcode: UInt8, payload: Data) throws -> [Data] {
    var mask = [UInt8](repeating: 0, count: 4)
    _ = SecRandomCopyBytes(kSecRandomDefault, 4, &mask)
    return try records(of: clientFrame(opcode: opcode, payload: payload, mask: mask))
  }

  // Each message becomes one record when it fits, which is nearly always; a larger one is cut into records the Server reads back in order.
  private func records(of bytes: Data) throws -> [Data] {
    let largest = maxRecordBytes - tagBytes
    var outer: [Data] = []
    var start = bytes.startIndex
    repeat {
      let end = min(start + largest, bytes.endIndex)
      let sealed = try sending.seal(try codec.encode(Data(bytes[start..<end])))
      outer.append(Data([UInt8(sealed.count >> 8), UInt8(sealed.count & 0xff)]) + sealed)
      start = end
    } while start < bytes.endIndex
    return outer
  }
}
