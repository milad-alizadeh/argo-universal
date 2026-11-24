package expo.modules.argochannel

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

// The vectors are made by `packages/client/.../native-channel-vectors.test.ts` from the Server's published Noise vector and the Server's own cipher.
class ChannelCoreTest {
  private val vectors = JSONObject(
    javaClass.classLoader!!.getResource("channel-vectors.json")!!.readText(),
  )

  private fun bytes(hex: String) = ByteArray(hex.length / 2) { hex.substring(it * 2, it * 2 + 2).toInt(16).toByte() }

  private fun joined(array: JSONArray) =
    (0 until array.length()).map { bytes(array.getString(it)) }.fold(ByteArray(0)) { all, part -> all + part }

  private val fixedMask = byteArrayOf(1, 2, 3, 4)

  // The channel as JavaScript hands it over: each direction has sealed or opened the vector's record 0.
  private fun session(compression: Boolean = false) = ChannelSession(
    bytes(vectors.getString("sendKey")), 1, bytes(vectors.getString("receiveKey")), 1,
    "GET / HTTP/1.1\r\n\r\n", vectors.getString("accept"), { fixedMask }, compression,
  )

  @Test
  fun theCipherAgreesWithThePublishedVectorRecords() {
    val vector = vectors.getJSONObject("vector")
    val sending = RecordCipher(bytes(vectors.getString("sendKey")), 0)
    val receiving = RecordCipher(bytes(vectors.getString("receiveKey")), 0)

    assertArrayEquals(bytes(vector.getString("clientRecord")), sending.seal(vector.getString("clientPayload").toByteArray()))
    assertEquals(vector.getString("serverPayload"), String(receiving.open(bytes(vector.getString("serverRecord")))))
  }

  @Test
  fun aMessageCutOverTwoRecordsArrivesWholeWhateverTheSocketMessageSizes() {
    val stream = joined(vectors.getJSONArray("upgradeThenFragmentedMessage"))
    val session = session()
    val events = mutableListOf<InnerEvent>()

    // Three bytes at a time, so every record is split across socket messages.
    for (start in stream.indices step 3) {
      events += session.receive(stream.copyOfRange(start, minOf(start + 3, stream.size))).events
    }

    assertEquals(listOf(InnerEvent.Open, InnerEvent.Message(vectors.getString("message"))), events)
  }

  @Test
  fun anUpgradeAnswerWithTheWrongAcceptIsRefused() {
    val error = assertThrows(ChannelException::class.java) {
      session().receive(bytes(vectors.getString("badAcceptUpgrade")))
    }

    assertEquals("upgrade refused: bad accept", error.message)
  }

  @Test
  fun aRecordThatFailsItsTagEndsTheChannel() {
    val error = assertThrows(ChannelException::class.java) {
      session().receive(bytes(vectors.getString("tamperedRecord")))
    }

    assertEquals("authentication", error.message)
  }

  @Test
  fun aClientFrameIsMaskedAndOpensToTheMessage() {
    val server = RecordCipher(bytes(vectors.getString("sendKey")), 1)
    val outer = session().send("hi")
    assertEquals(1, outer.size)

    val frame = server.open(outer[0].copyOfRange(2, outer[0].size))

    assertEquals(0x81, frame[0].toInt() and 0xff)
    assertEquals(0x80 or 2, frame[1].toInt() and 0xff)
    assertArrayEquals(fixedMask, frame.copyOfRange(2, 6))
    assertEquals("hi", String(ByteArray(2) { (frame[6 + it].toInt() xor fixedMask[it].toInt()).toByte() }))
  }

  @Test
  fun aPingIsAnsweredWithAMaskedPong() {
    val server = RecordCipher(bytes(vectors.getString("sendKey")), 1)
    val result = session().receive(joined(vectors.getJSONArray("upgradeThenPing")))

    assertEquals(listOf<InnerEvent>(InnerEvent.Open), result.events)
    assertEquals(1, result.replies.size)
    val frame = server.open(result.replies[0].copyOfRange(2, result.replies[0].size))
    assertEquals(0x8a, frame[0].toInt() and 0xff)
    assertEquals(0x80, frame[1].toInt() and 0x80)
  }

  // With compression agreed every record opens with a byte: the Server's raw deflate is inflated, and a message it sent as it is passes through.
  @Test
  fun aDeflatedRecordArrivesAsItsMessage() {
    val events = session(compression = true).receive(joined(vectors.getJSONArray("upgradeThenCompressedMessage"))).events

    assertEquals(listOf(InnerEvent.Open, InnerEvent.Message(vectors.getString("compressedMessage"))), events)
  }

  @Test
  fun aStoredRecordArrivesAsItsMessage() {
    val events = session(compression = true).receive(joined(vectors.getJSONArray("upgradeThenStoredMessage"))).events

    assertEquals(listOf(InnerEvent.Open, InnerEvent.Message(vectors.getString("message"))), events)
  }

  @Test
  fun aRecordThatInflatesBeyondWhatARecordHoldsIsRefused() {
    val error = assertThrows(ChannelException::class.java) {
      session(compression = true).receive(joined(vectors.getJSONArray("upgradeThenOversizedRecord")))
    }

    assertEquals("malformed compressed record", error.message)
  }

  @Test
  fun anUnknownLeadingByteIsRefused() {
    val error = assertThrows(ChannelException::class.java) {
      session(compression = true).receive(joined(vectors.getJSONArray("upgradeThenUnknownLeadingByte")))
    }

    assertEquals("malformed compressed record", error.message)
  }

  @Test
  fun withCompressionAgreedWhatIsSentGoesBehindAZeroByte() {
    val server = RecordCipher(bytes(vectors.getString("sendKey")), 1)
    val outer = session(compression = true).send("hi")

    val record = server.open(outer[0].copyOfRange(2, outer[0].size))

    assertEquals(0, record[0].toInt())
    assertEquals(0x81, record[1].toInt() and 0xff)
  }

  @Test
  fun aFrameLengthBeyondAnyMessageIsMalformedRatherThanAWait() {
    val stream = InnerStream("x")
    val head = "HTTP/1.1 101 Switching Protocols\r\nSec-WebSocket-Accept: x\r\n\r\n".toByteArray()
    val huge = byteArrayOf(0x81.toByte(), 127, -1, -1, -1, -1, -1, -1, -1, -1)

    val error = assertThrows(ChannelException::class.java) { stream.push(head + huge) }

    assertEquals("malformed frame length", error.message)
  }
}
