package expo.modules.argochannel

import java.io.ByteArrayOutputStream
import java.security.GeneralSecurityException
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

// The channel's record path, with no sockets and no Expo in it (ADR-0045). What arrives is one pipeline:
// outer WebSocket message -> records (two-byte length) -> decrypt -> PayloadCodec -> inner HTTP upgrade and WebSocket frames -> message strings.

class ChannelException(message: String) : Exception(message)

private const val TAG_BYTES = 16
private const val MAX_RECORD_BYTES = 65_535

/** One direction of the channel: a key and a record number, counted from the number JavaScript's handshake reached. The number is not on the wire. */
class RecordCipher(key: ByteArray, private var records: Long) {
  private val key = SecretKeySpec(key, "ChaCha20")

  private fun nextNonce(): IvParameterSpec {
    val nonce = ByteArray(12)
    for (index in 0 until 8) nonce[4 + index] = (records ushr (8 * index)).toByte()
    records += 1
    return IvParameterSpec(nonce)
  }

  private fun run(mode: Int, input: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("ChaCha20-Poly1305")
    cipher.init(mode, key, nextNonce())
    return cipher.doFinal(input)
  }

  fun open(record: ByteArray): ByteArray {
    if (record.size < TAG_BYTES) throw ChannelException("authentication")
    try {
      return run(Cipher.DECRYPT_MODE, record)
    } catch (_: GeneralSecurityException) {
      throw ChannelException("authentication")
    }
  }

  fun seal(plaintext: ByteArray): ByteArray = run(Cipher.ENCRYPT_MODE, plaintext)
}

/**
 * What happens to a record's plaintext between the cipher and the inner stream. Today it is nothing. Compression (#2705) is a codec here:
 * `decode` inflates after a record is opened, `encode` deflates before one is sealed, and the pipeline needs no other change.
 */
interface PayloadCodec {
  fun decode(plaintext: ByteArray): ByteArray
  fun encode(plaintext: ByteArray): ByteArray
}

object IdentityCodec : PayloadCodec {
  override fun decode(plaintext: ByteArray) = plaintext
  override fun encode(plaintext: ByteArray) = plaintext
}

/** Records come out of the byte stream by the two-byte length that precedes each. */
class RecordReader {
  private var pending = ByteArray(0)

  fun push(chunk: ByteArray): List<ByteArray> {
    pending += chunk
    val records = mutableListOf<ByteArray>()
    while (pending.size >= 2) {
      val length = (pending[0].toInt() and 0xff shl 8) or (pending[1].toInt() and 0xff)
      if (pending.size < 2 + length) break
      records.add(pending.copyOfRange(2, 2 + length))
      pending = pending.copyOfRange(2 + length, pending.size)
    }
    return records
  }
}

sealed class InnerEvent {
  object Open : InnerEvent()
  data class Message(val text: String) : InnerEvent()
  data class Close(val code: Int, val reason: String) : InnerEvent()
}

class InnerOutput {
  val events = mutableListOf<InnerEvent>()

  /** Frames to send back: the pong for a ping, the echo of a close. */
  val replies = mutableListOf<Pair<Int, ByteArray>>()
}

private val HEAD_END = "\r\n\r\n".toByteArray()

private fun indexOf(haystack: ByteArray, needle: ByteArray): Int {
  for (at in 0..haystack.size - needle.size) {
    if (needle.indices.all { haystack[at + it] == needle[it] }) return at
  }
  return -1
}

/** The plaintext inside the channel: the Server's answer to the WebSocket upgrade, then RFC 6455 frames. Control frames are answered here; text and binary frames, however split, are one message. */
class InnerStream(private val accept: String) {
  private var buffer = ByteArray(0)
  private var upgraded = false
  private val fragments = ByteArrayOutputStream()

  fun push(chunk: ByteArray): InnerOutput {
    buffer += chunk
    val output = InnerOutput()
    if (!upgraded) {
      val end = indexOf(buffer, HEAD_END)
      if (end < 0) return output
      checkUpgrade(String(buffer, 0, end, Charsets.UTF_8))
      buffer = buffer.copyOfRange(end + HEAD_END.size, buffer.size)
      upgraded = true
      output.events.add(InnerEvent.Open)
    }
    while (true) {
      val frame = takeFrame() ?: break
      handle(frame, output)
    }
    return output
  }

  private fun checkUpgrade(head: String) {
    val lines = head.split("\r\n")
    val status = lines.first().split(" ").getOrNull(1)
    if (status != "101") throw ChannelException("upgrade refused: ${lines.first()}")
    val answered = lines.drop(1)
      .firstOrNull { it.lowercase().startsWith("sec-websocket-accept:") }
      ?.substringAfter(":")?.trim()
    if (answered != accept) throw ChannelException("upgrade refused: bad accept")
  }

  private class Frame(val fin: Boolean, val opcode: Int, val payload: ByteArray)

  private fun takeFrame(): Frame? {
    if (buffer.size < 2) return null
    val masked = buffer[1].toInt() and 0x80 != 0
    var length = buffer[1].toInt() and 0x7f
    var at = 2
    if (length == 126) {
      if (buffer.size < 4) return null
      length = (buffer[2].toInt() and 0xff shl 8) or (buffer[3].toInt() and 0xff)
      at = 4
    } else if (length == 127) {
      if (buffer.size < 10) return null
      length = (2 until 10).fold(0L) { sum, index -> (sum shl 8) or (buffer[index].toLong() and 0xff) }.toInt()
      at = 10
    }
    val maskAt = at
    if (masked) at += 4
    if (buffer.size < at + length) return null
    val payload = buffer.copyOfRange(at, at + length)
    if (masked) for (index in payload.indices) payload[index] = (payload[index].toInt() xor buffer[maskAt + index % 4].toInt()).toByte()
    val frame = Frame(buffer[0].toInt() and 0x80 != 0, buffer[0].toInt() and 0x0f, payload)
    buffer = buffer.copyOfRange(at + length, buffer.size)
    return frame
  }

  private fun handle(frame: Frame, output: InnerOutput) {
    when (frame.opcode) {
      9 -> output.replies.add(10 to frame.payload)
      10 -> {}
      8 -> {
        val payload = frame.payload
        val code = if (payload.size >= 2) (payload[0].toInt() and 0xff shl 8) or (payload[1].toInt() and 0xff) else 1005
        val reason = if (payload.size > 2) String(payload, 2, payload.size - 2, Charsets.UTF_8) else ""
        output.replies.add(8 to payload)
        output.events.add(InnerEvent.Close(code, reason))
      }
      else -> {
        fragments.write(frame.payload)
        if (frame.fin) {
          output.events.add(InnerEvent.Message(fragments.toString(Charsets.UTF_8.name())))
          fragments.reset()
        }
      }
    }
  }
}

private val random = SecureRandom()

/** A client's frame: masked, as RFC 6455 says a client's always are. */
fun clientFrame(opcode: Int, payload: ByteArray): ByteArray {
  val mask = ByteArray(4).also { random.nextBytes(it) }
  val out = ByteArrayOutputStream()
  out.write(0x80 or opcode)
  val length = payload.size
  when {
    length <= 125 -> out.write(0x80 or length)
    length <= 65_535 -> {
      out.write(0x80 or 126)
      out.write(length ushr 8)
      out.write(length and 0xff)
    }
    else -> {
      out.write(0x80 or 127)
      for (shift in 56 downTo 0 step 8) out.write(((length.toLong() ushr shift) and 0xff).toInt())
    }
  }
  out.write(mask)
  for (index in payload.indices) out.write(payload[index].toInt() xor mask[index % 4].toInt())
  return out.toByteArray()
}

class SessionResult(val events: List<InnerEvent>, val replies: List<ByteArray>)

/** Everything a handed-over channel does, as data in and data out. The socket code feeds it outer messages and sends what it returns. */
class ChannelSession(
  sendKey: ByteArray,
  sendRecords: Long,
  receiveKey: ByteArray,
  receiveRecords: Long,
  private val upgrade: String,
  accept: String,
  private val codec: PayloadCodec = IdentityCodec,
) {
  private val sending = RecordCipher(sendKey, sendRecords)
  private val receiving = RecordCipher(receiveKey, receiveRecords)
  private val reader = RecordReader()
  private val inner = InnerStream(accept)

  /** The first outer message: the upgrade request, sealed. */
  fun start(): List<ByteArray> = records(upgrade.toByteArray())

  /** One outer message in: the events it completes, and the outer messages to send in answer. */
  fun receive(outer: ByteArray): SessionResult {
    val events = mutableListOf<InnerEvent>()
    val replies = mutableListOf<ByteArray>()
    for (record in reader.push(outer)) {
      val output = inner.push(codec.decode(receiving.open(record)))
      events += output.events
      for ((opcode, payload) in output.replies) replies += frames(opcode, payload)
    }
    return SessionResult(events, replies)
  }

  fun send(message: String): List<ByteArray> = frames(1, message.toByteArray())

  fun close(code: Int, reason: String): List<ByteArray> =
    frames(8, byteArrayOf((code ushr 8).toByte(), code.toByte()) + reason.toByteArray())

  private fun frames(opcode: Int, payload: ByteArray) = records(clientFrame(opcode, payload))

  // Each message becomes one record when it fits, which is nearly always; a larger one is cut into records the Server reads back in order.
  private fun records(bytes: ByteArray): List<ByteArray> {
    val largest = MAX_RECORD_BYTES - TAG_BYTES
    val outer = mutableListOf<ByteArray>()
    var start = 0
    do {
      val end = minOf(start + largest, bytes.size)
      val sealed = sending.seal(codec.encode(bytes.copyOfRange(start, end)))
      outer.add(byteArrayOf((sealed.size ushr 8).toByte(), sealed.size.toByte()) + sealed)
      start = end
    } while (start < bytes.size)
    return outer
  }
}
