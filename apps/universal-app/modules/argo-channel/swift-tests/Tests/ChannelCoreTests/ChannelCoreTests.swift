import XCTest

@testable import ChannelCore

// The vectors are made by `packages/client/.../native-channel-vectors.test.ts` from the Server's published Noise vector and the Server's own cipher.
private struct Vectors: Decodable {
  struct Vector: Decodable {
    let clientPayload: String
    let clientRecord: String
    let serverPayload: String
    let serverRecord: String
  }

  let sendKey: String
  let receiveKey: String
  let vector: Vector
  let accept: String
  let upgradeThenFragmentedMessage: [String]
  let message: String
  let upgradeThenPing: [String]
  let badAcceptUpgrade: String
  let tamperedRecord: String
}

private func bytes(_ hex: String) -> Data {
  var data = Data()
  var index = hex.startIndex
  while index < hex.endIndex {
    let next = hex.index(index, offsetBy: 2)
    data.append(UInt8(hex[index..<next], radix: 16)!)
    index = next
  }
  return data
}

private func joined(_ hex: [String]) -> Data {
  var data = Data()
  for part in hex { data.append(bytes(part)) }
  return data
}

private func loadVectors() throws -> Vectors {
  let path = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    .appendingPathComponent("fixtures/channel-vectors.json")
  return try JSONDecoder().decode(Vectors.self, from: Data(contentsOf: path))
}

private func joined(head: Data, _ tail: Data) -> Data {
  var data = head
  data.append(tail)
  return data
}

private let fixedMask: [UInt8] = [1, 2, 3, 4]

final class ChannelCoreTests: XCTestCase {
  // The channel as JavaScript hands it over: each direction has sealed or opened the vector's record 0.
  private func session(_ vectors: Vectors, deliver: @escaping (Data) -> Void = { _ in }) -> ChannelSession {
    ChannelSession(
      sendKey: bytes(vectors.sendKey), sendRecords: 1, receiveKey: bytes(vectors.receiveKey), receiveRecords: 1,
      upgrade: "GET / HTTP/1.1\r\n\r\n", accept: vectors.accept, deliver: deliver, randomMask: { fixedMask })
  }

  func testTheCipherAgreesWithThePublishedVectorRecords() throws {
    let vectors = try loadVectors()
    var sending = RecordCipher(key: bytes(vectors.sendKey), records: 0)
    var receiving = RecordCipher(key: bytes(vectors.receiveKey), records: 0)

    XCTAssertEqual(try sending.seal(Data(vectors.vector.clientPayload.utf8)), bytes(vectors.vector.clientRecord))
    XCTAssertEqual(
      String(decoding: try receiving.open(bytes(vectors.vector.serverRecord)), as: UTF8.self),
      vectors.vector.serverPayload)
  }

  func testAMessageCutOverTwoRecordsArrivesWholeWhateverTheSocketMessageSizes() throws {
    let vectors = try loadVectors()
    let session = session(vectors)
    let stream = joined(vectors.upgradeThenFragmentedMessage)
    var events: [InnerEvent] = []

    // Three bytes at a time, so every record is split across socket messages.
    var start = stream.startIndex
    while start < stream.endIndex {
      let end = min(start + 3, stream.endIndex)
      events += try session.receive(stream[start..<end])
      start = end
    }

    XCTAssertEqual(events, [.open, .message(vectors.message)])
  }

  func testAnUpgradeAnswerWithTheWrongAcceptIsRefused() throws {
    let vectors = try loadVectors()

    XCTAssertThrowsError(try session(vectors).receive(bytes(vectors.badAcceptUpgrade))) {
      XCTAssertEqual($0 as? ChannelError, .upgradeRefused("bad accept"))
    }
  }

  func testARecordThatFailsItsTagEndsTheChannel() throws {
    let vectors = try loadVectors()

    XCTAssertThrowsError(try session(vectors).receive(bytes(vectors.tamperedRecord))) {
      XCTAssertEqual($0 as? ChannelError, .authentication)
    }
  }

  func testAClientFrameIsMaskedAndOpensToTheMessage() throws {
    let vectors = try loadVectors()
    var server = RecordCipher(key: bytes(vectors.sendKey), records: 1)
    var outer: [Data] = []
    try session(vectors) { outer.append($0) }.send(message: "hi")
    XCTAssertEqual(outer.count, 1)

    let frame = [UInt8](try server.open(outer[0].dropFirst(2)))

    XCTAssertEqual(frame[0], 0x81)
    XCTAssertEqual(frame[1], 0x80 | 2)
    XCTAssertEqual(Array(frame[2..<6]), fixedMask)
    XCTAssertEqual(String(decoding: zip(frame[6...], fixedMask).map { $0 ^ $1 }, as: UTF8.self), "hi")
  }

  func testAPingIsAnsweredWithAMaskedPong() throws {
    let vectors = try loadVectors()
    var server = RecordCipher(key: bytes(vectors.sendKey), records: 1)
    let stream = joined(vectors.upgradeThenPing)

    var replies: [Data] = []
    let events = try session(vectors) { replies.append($0) }.receive(stream)

    XCTAssertEqual(events, [.open])
    XCTAssertEqual(replies.count, 1)
    let frame = [UInt8](try server.open(replies[0].dropFirst(2)))
    XCTAssertEqual(frame[0], 0x8a)
    XCTAssertEqual(frame[1] & 0x80, 0x80)
  }

  func testAFrameLengthBeyondAnyMessageIsMalformedRatherThanAWait() {
    var stream = InnerStream(accept: "x")
    let head = Data("HTTP/1.1 101 Switching Protocols\r\nSec-WebSocket-Accept: x\r\n\r\n".utf8)
    let huge = Data([0x81, 127, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])

    XCTAssertThrowsError(try stream.push(joined(head: head, huge))) {
      XCTAssertEqual($0 as? ChannelError, .malformed("frame length"))
    }
  }

  // A send from one thread and a pong for a ping on another are numbered and delivered under one lock, so the Server reads the records in the order it counts them.
  func testSendsAndPongsReachTheSocketInRecordOrder() throws {
    let vectors = try loadVectors()
    let delivered = DeliveredRecords()
    let session = session(vectors) { delivered.append($0) }
    let pings = 200
    var server = RecordCipher(key: bytes(vectors.receiveKey), records: 1)
    var incoming = Data()
    incoming.append(framed(try server.seal(Data(upgradeAnswer(vectors.accept).utf8))))
    for _ in 0..<pings { incoming.append(framed(try server.seal(Data([0x89, 0])))) }

    let receiving = DispatchQueue(label: "receive")
    let group = DispatchGroup()
    receiving.async(group: group) {
      var at = incoming.startIndex
      while at < incoming.endIndex {
        let end = min(at + 20, incoming.endIndex)
        _ = try? session.receive(incoming[at..<end])
        at = end
      }
    }
    DispatchQueue.global().async(group: group) {
      for index in 0..<pings { try? session.send(message: "m\(index)") }
    }
    group.wait()

    var opening = RecordCipher(key: bytes(vectors.sendKey), records: 1)
    let records = delivered.all()
    XCTAssertEqual(records.count, pings * 2)
    for record in records {
      XCTAssertNoThrow(try opening.open(record.dropFirst(2)))
    }
  }
}

private final class DeliveredRecords {
  private let lock = NSLock()
  private var records: [Data] = []

  func append(_ record: Data) {
    lock.lock()
    records.append(record)
    lock.unlock()
  }

  func all() -> [Data] {
    lock.lock()
    defer { lock.unlock() }
    return records
  }
}

private func framed(_ record: Data) -> Data {
  var data = Data([UInt8(record.count >> 8), UInt8(record.count & 0xff)])
  data.append(record)
  return data
}

private func upgradeAnswer(_ accept: String) -> String {
  "HTTP/1.1 101 Switching Protocols\r\nSec-WebSocket-Accept: \(accept)\r\n\r\n"
}
