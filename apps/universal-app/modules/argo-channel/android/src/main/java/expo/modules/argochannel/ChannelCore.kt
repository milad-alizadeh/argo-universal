package expo.modules.argochannel

import java.io.ByteArrayOutputStream
import java.security.GeneralSecurityException
import java.security.SecureRandom
import java.util.zip.DataFormatException
import java.util.zip.Inflater
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

// The channel's record path, with no sockets and no Expo in it, so it can be read and tested on its own (ADR-0045).
// What arrives is one pipeline: outer WebSocket message -> records (two-byte length) -> decrypt -> inner HTTP upgrade and WebSocket frames -> message strings.
// Once the Server has agreed to compress (ADR-0045), every record opens with a byte: 0 for the bytes as they are, 1 for raw deflate. Receiving inflates; what this side sends is always as it is.

class ChannelException(message: String) : Exception(message)

private const val TAG_BYTES = 16
private const val MAX_RECORD_BYTES = 65_535
private const val MAX_FRAME_BYTES = 1L shl 30

// With the leading byte, a record holds one byte less of message.
private const val MAX_MESSAGE_BYTES = MAX_RECORD_BYTES - TAG_BYTES - 1

/**
 * The leading byte of a record, undone: raw deflate is inflated by `java.util.zip.Inflater(true)`, which is deflate without the zlib header (RFC 1951).
 * A record never holds more than [MAX_MESSAGE_BYTES] of message, so the output buffer is one byte larger and anything that fills it is refused rather than inflated.
 */
fun unpack(record: ByteArray): ByteArray {
  if (record.isEmpty()) throw ChannelException("malformed compressed record")
  return when (record[0].toInt()) {
    0 -> record.copyOfRange(1, record.size)
    1 -> inflate(record.copyOfRange(1, record.size))
    else -> throw ChannelException("malformed compressed record")
  }
}

private fun inflate(body: ByteArray): ByteArray {
  val inflater = Inflater(true)
  try {
    inflater.setInput(body)
    val output = ByteArray(MAX_MESSAGE_BYTES + 1)
    val size = inflater.inflate(output)
    if (!inflater.finished() || size == 0 || size > MAX_MESSAGE_BYTES) throw ChannelException("malformed compressed record")
    return output.copyOf(size)
  } catch (error: DataFormatException) {
    throw ChannelException("malformed compressed record")
  } finally {
    inflater.end()
  }
}

/** A byte queue that reads from the front without copying what is left, so a long stream is read in linear time. */
class ByteQueue {
  private var buffer = ByteArray(1024)
  private var start = 0
  private var end = 0

  val size: Int get() = end - start

  fun append(chunk: ByteArray) {
    if (end + chunk.size > buffer.size) {
      val live = size
      val grown = ByteArray(maxOf(buffer.size, (live + chunk.size) * 2))
      System.arraycopy(buffer, start, grown, 0, live)
      buffer = grown
      start = 0
      end = live
    }
    System.arraycopy(chunk, 0, buffer, end, chunk.size)
    end += chunk.size
  }

  fun byteAt(index: Int): Int = buffer[start + index].toInt() and 0xff

  fun take(length: Int): ByteArray {
    val taken = buffer.copyOfRange(start, start + length)
    start += length
    if (start == end) {
      start = 0
      end = 0
    }
    return taken
  }
}

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

/** Records come out of the byte stream by the two-byte length that precedes each. */
class RecordReader {
  private val pending = ByteQueue()

  fun push(chunk: ByteArray): List<ByteArray> {
    pending.append(chunk)
    val records = mutableListOf<ByteArray>()
    while (pending.size >= 2) {
      val length = (pending.byteAt(0) shl 8) or pending.byteAt(1)
      if (pending.size < 2 + length) break
      pending.take(2)
      records.add(pending.take(length))
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

/** The plaintext inside the channel: the Server's answer to the WebSocket upgrade, then RFC 6455 frames. Control frames are answered here; text and binary frames, however split, are one message. */
class InnerStream(private val accept: String) {
  private val queue = ByteQueue()
  private var upgraded = false
  private val fragments = ByteArrayOutputStream()

  fun push(chunk: ByteArray): InnerOutput {
    queue.append(chunk)
    val output = InnerOutput()
    if (!upgraded) {
      val length = headLength() ?: return output
      checkUpgrade(String(queue.take(length), Charsets.UTF_8))
      upgraded = true
      output.events.add(InnerEvent.Open)
    }
    while (true) {
      val frame = takeFrame() ?: break
      handle(frame, output)
    }
    return output
  }

  // How many bytes the head takes, through its blank line, once all of it is here.
  private fun headLength(): Int? {
    for (at in 0..queue.size - HEAD_END.size) {
      if (HEAD_END.indices.all { queue.byteAt(at + it) == (HEAD_END[it].toInt() and 0xff) }) return at + HEAD_END.size
    }
    return null
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

  // Reads only the header to learn the frame's length, then takes the frame once all of it is here.
  private fun takeFrame(): Frame? {
    if (queue.size < 2) return null
    val masked = queue.byteAt(1) and 0x80 != 0
    var length = (queue.byteAt(1) and 0x7f).toLong()
    var at = 2
    if (length == 126L) {
      if (queue.size < 4) return null
      length = ((queue.byteAt(2) shl 8) or queue.byteAt(3)).toLong()
      at = 4
    } else if (length == 127L) {
      if (queue.size < 10) return null
      length = (2 until 10).fold(0L) { sum, index -> (sum shl 8) or queue.byteAt(index).toLong() }
      at = 10
    }
    if (length < 0 || length > MAX_FRAME_BYTES) throw ChannelException("malformed frame length")
    val maskAt = at
    if (masked) at += 4
    if (queue.size.toLong() < at + length) return null
    val mask = if (masked) IntArray(4) { queue.byteAt(maskAt + it) } else IntArray(0)
    val first = queue.byteAt(0)
    val payload = queue.take(at + length.toInt()).copyOfRange(at, at + length.toInt())
    if (masked) for (index in payload.indices) payload[index] = (payload[index].toInt() xor mask[index % 4]).toByte()
    return Frame(first and 0x80 != 0, first and 0x0f, payload)
  }

  private fun handle(frame: Frame, output: InnerOutput) {
    when (frame.opcode) {
      9 -> output.replies.add(10 to frame.payload)
      10 -> {}
      8 -> {
        val payload = frame.payload
        val code = if (payload.size >= 2) ((payload[0].toInt() and 0xff) shl 8) or (payload[1].toInt() and 0xff) else 1005
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

fun secureMask(): ByteArray = ByteArray(4).also { random.nextBytes(it) }

/** A client's frame: masked, as RFC 6455 says a client's always are. */
fun clientFrame(opcode: Int, payload: ByteArray, mask: ByteArray): ByteArray {
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

/**
 * Everything a handed-over channel does, as data in and data out. The socket code feeds it outer messages and sends what it returns.
 * The two ciphers count records, so every call that touches them is synchronized: a receive, a send and a close never interleave and no record number is reused or skipped.
 */
class ChannelSession(
  sendKey: ByteArray,
  sendRecords: Long,
  receiveKey: ByteArray,
  receiveRecords: Long,
  private val upgrade: String,
  accept: String,
  private val mask: () -> ByteArray = ::secureMask,
  private val compression: Boolean = false,
) {
  private val sending = RecordCipher(sendKey, sendRecords)
  private val receiving = RecordCipher(receiveKey, receiveRecords)
  private val reader = RecordReader()
  private val inner = InnerStream(accept)

  /** The first outer message: the upgrade request, sealed. */
  @Synchronized
  fun start(): List<ByteArray> = records(upgrade.toByteArray())

  /** One outer message in: the events it completes, and the outer messages to send in answer. */
  @Synchronized
  fun receive(outer: ByteArray): SessionResult {
    val events = mutableListOf<InnerEvent>()
    val replies = mutableListOf<ByteArray>()
    for (record in reader.push(outer)) {
      val opened = receiving.open(record)
      val output = inner.push(if (compression) unpack(opened) else opened)
      events += output.events
      for ((opcode, payload) in output.replies) replies += frames(opcode, payload)
    }
    return SessionResult(events, replies)
  }

  @Synchronized
  fun send(message: String): List<ByteArray> = frames(1, message.toByteArray())

  @Synchronized
  fun close(code: Int, reason: String): List<ByteArray> =
    frames(8, byteArrayOf((code ushr 8).toByte(), code.toByte()) + reason.toByteArray())

  private fun frames(opcode: Int, payload: ByteArray) = records(clientFrame(opcode, payload, mask()))

  // Each message becomes one record when it fits, which is nearly always; a larger one is cut into records the Server reads back in order.
  private fun records(bytes: ByteArray): List<ByteArray> {
    val largest = if (compression) MAX_MESSAGE_BYTES else MAX_RECORD_BYTES - TAG_BYTES
    val outer = mutableListOf<ByteArray>()
    var start = 0
    do {
      val end = minOf(start + largest, bytes.size)
      val piece = bytes.copyOfRange(start, end)
      val sealed = sending.seal(if (compression) byteArrayOf(0) + piece else piece)
      outer.add(byteArrayOf((sealed.size ushr 8).toByte(), sealed.size.toByte()) + sealed)
      start = end
    } while (start < bytes.size)
    return outer
  }
}
