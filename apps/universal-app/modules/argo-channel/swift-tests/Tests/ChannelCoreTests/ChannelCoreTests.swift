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
  private func session(_ vectors: Vectors) -> ChannelSession {
    ChannelSession(
      sendKey: bytes(vectors.sendKey), sendRecords: 1, receiveKey: bytes(vectors.receiveKey), receiveRecords: 1,
      upgrade: "GET / HTTP/1.1\r\n\r\n", accept: vectors.accept, randomMask: { fixedMask })
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
      events += try session.receive(stream[start..<end]).events
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
    let outer = try session(vectors).send(message: "hi")
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

    let result = try session(vectors).receive(stream)

    XCTAssertEqual(result.events, [.open])
    XCTAssertEqual(result.replies.count, 1)
    let frame = [UInt8](try server.open(result.replies[0].dropFirst(2)))
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
}
