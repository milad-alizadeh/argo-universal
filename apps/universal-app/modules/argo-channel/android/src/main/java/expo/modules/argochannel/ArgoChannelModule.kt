package expo.modules.argochannel

import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString

class HandOverRecord : Record {
  @Field val sendKey: String = ""
  @Field val sendRecords: Double = 0.0
  @Field val receiveKey: String = ""
  @Field val receiveRecords: Double = 0.0
  @Field val upgrade: String = ""
  @Field val accept: String = ""
}

/**
 * One socket the module owns. Before the hand-over its bytes go to JavaScript as base64 for the handshake; after it, `session` opens every record
 * and only finished message strings leave.
 */
private class Channel(private val id: String, private val emit: (Map<String, Any?>) -> Unit) {
  lateinit var socket: WebSocket
  private var session: ChannelSession? = null
  private var listening = false
  private val held = mutableListOf<Map<String, Any?>>()
  private var closed = false

  @Synchronized
  fun listen() {
    listening = true
    val waiting = held.toList()
    held.clear()
    waiting.forEach(emit)
  }

  @Synchronized
  fun event(event: Map<String, Any?>) {
    val tagged = event + ("id" to id)
    if (listening) emit(tagged) else held.add(tagged)
  }

  @Synchronized
  fun handOver(record: HandOverRecord) {
    val session = ChannelSession(
      Base64.decode(record.sendKey, Base64.NO_WRAP), record.sendRecords.toLong(),
      Base64.decode(record.receiveKey, Base64.NO_WRAP), record.receiveRecords.toLong(),
      record.upgrade, record.accept,
    )
    this.session = session
    session.start().forEach(::sendOuter)
  }

  /** A message from the Server's socket: bytes for JavaScript's handshake, or, once handed over, records to open. */
  @Synchronized
  fun received(outer: ByteArray) {
    val session = session
    if (session == null) {
      event(mapOf("type" to "bytes", "data" to Base64.encodeToString(outer, Base64.NO_WRAP)))
      return
    }
    try {
      val result = session.receive(outer)
      result.replies.forEach(::sendOuter)
      for (inner in result.events) {
        event(describe(inner))
        if (inner is InnerEvent.Close) socket.close(1000, null)
      }
    } catch (error: ChannelException) {
      ended(1006, "", error.message)
      socket.close(1000, null)
    }
  }

  @Synchronized
  fun send(message: String) {
    val session = session ?: throw ChannelException("not handed over")
    session.send(message).forEach(::sendOuter)
  }

  @Synchronized
  fun close(code: Int, reason: String) {
    session?.close(code, reason)?.forEach(::sendOuter)
    socket.close(1000, null)
  }

  /** The socket ended, however it did; JavaScript hears of it once. */
  @Synchronized
  fun ended(code: Int, reason: String, error: String?) {
    if (closed) return
    closed = true
    event(mapOf("type" to "close", "code" to code, "reason" to reason, "error" to error))
  }

  private fun sendOuter(outer: ByteArray) {
    socket.send(outer.toByteString())
  }

  private fun describe(inner: InnerEvent): Map<String, Any?> = when (inner) {
    is InnerEvent.Open -> mapOf("type" to "open")
    is InnerEvent.Message -> mapOf("type" to "message", "data" to inner.text)
    is InnerEvent.Close -> mapOf("type" to "close", "code" to inner.code, "reason" to inner.reason)
  }
}

/**
 * The channel's WebSocket, owned natively (#2704). JavaScript opens the socket and runs the Noise handshake over it, then hands over the session
 * keys; from there this module decrypts each record, decompresses it when the channel does (#2705), and hands JavaScript one message string per
 * event, and does the reverse to send.
 */
class ArgoChannelModule : Module() {
  private val channels = ConcurrentHashMap<String, Channel>()

  // Cleartext `ws://` to an address on the local network or a tailnet is permitted for the App (`usesCleartextTraffic`), as it is for React Native's own WebSocket.
  private val client = OkHttpClient.Builder().pingInterval(0, TimeUnit.SECONDS).build()

  override fun definition() = ModuleDefinition {
    Name("ArgoChannel")

    Events("channel")

    AsyncFunction("open") { url: String, timeoutMs: Double, promise: Promise ->
      val id = UUID.randomUUID().toString()
      val channel = Channel(id) { event -> sendEvent("channel", event) }
      var settled = false

      val settle = { error: String? ->
        synchronized(channel) {
          if (!settled) {
            settled = true
            if (error == null) promise.resolve(id) else promise.reject("ERR_CHANNEL_OPEN", error, null)
          }
        }
      }

      val listener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
          channels[id] = channel
          settle(null)
        }

        override fun onMessage(webSocket: WebSocket, bytes: ByteString) = channel.received(bytes.toByteArray())

        override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
          webSocket.close(code, null)
          channel.ended(code, reason, null)
          channels.remove(id)
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
          channel.ended(code, reason, null)
          channels.remove(id)
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
          settle(t.message ?: "Could not open $url")
          channel.ended(1006, "", t.message)
          channels.remove(id)
        }
      }

      val timed = client.newBuilder().connectTimeout(timeoutMs.toLong(), TimeUnit.MILLISECONDS).build()
      channel.socket = timed.newWebSocket(Request.Builder().url(url).build(), listener)
    }

    Function("listen") { id: String -> channels[id]?.listen() }

    Function("write") { id: String, base64: String ->
      channels[id]?.socket?.send(Base64.decode(base64, Base64.NO_WRAP).toByteString())
    }

    Function("handOver") { id: String, record: HandOverRecord -> channels[id]?.handOver(record) }

    Function("send") { id: String, message: String -> channels[id]?.send(message) }

    Function("close") { id: String, code: Int, reason: String -> channels[id]?.close(code, reason) }
  }
}
