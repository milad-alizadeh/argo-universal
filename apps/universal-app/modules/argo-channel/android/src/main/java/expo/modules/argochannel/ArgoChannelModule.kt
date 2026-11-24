package expo.modules.argochannel

import android.util.Base64
import com.facebook.react.modules.network.OkHttpClientProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString

class OpenRecord : Record {
  @Field val url: String = ""
  @Field val timeoutMs: Double = 0.0
  @Field val headers: Map<String, String> = emptyMap()
}

class HandOverRecord : Record {
  @Field val sendKey: String = ""
  @Field val sendRecords: Double = 0.0
  @Field val receiveKey: String = ""
  @Field val receiveRecords: Double = 0.0
  @Field val upgrade: String = ""
  @Field val accept: String = ""
  @Field val compression: Boolean = false
}

/**
 * One socket the module owns. Before the hand-over its bytes go to JavaScript as base64 for the handshake; after it, `session` opens every record
 * and only finished message strings leave.
 */
private class Channel(private val id: String, private val emit: (Map<String, Any?>) -> Unit) {
  private lateinit var socket: WebSocket
  private var session: ChannelSession? = null
  private var closed = false

  /** Assigned under the lock, so a callback that runs before `newWebSocket` returns waits for it. */
  fun attach(socket: WebSocket) = synchronized(this) { this.socket = socket }

  @Synchronized
  fun write(bytes: ByteArray) = sendOuter(bytes)

  fun event(event: Map<String, Any?>) {
    emit(event + ("id" to id))
  }

  @Synchronized
  fun handOver(record: HandOverRecord) {
    val session = ChannelSession(
      Base64.decode(record.sendKey, Base64.NO_WRAP), record.sendRecords.toLong(),
      Base64.decode(record.receiveKey, Base64.NO_WRAP), record.receiveRecords.toLong(),
      record.upgrade, record.accept, compression = record.compression,
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
        if (inner is InnerEvent.Close) {
          ended(inner.code, inner.reason, null)
          socket.close(1000, null)
        } else {
          event(describe(inner))
        }
      }
    } catch (error: Exception) {
      // Anything the record path throws ends the channel; it must not escape to OkHttp's thread.
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
    is InnerEvent.Close -> emptyMap()
  }
}

/**
 * The channel's WebSocket, owned natively (#2704). JavaScript opens the socket and runs the Noise handshake over it, then hands over the session
 * keys; from there this module decrypts each record, and hands JavaScript one message string per
 * event, and does the reverse to send.
 */
class ArgoChannelModule : Module() {
  private val channels = ConcurrentHashMap<String, Channel>()

  // React Native's own client, so the channel inherits its network configuration (cleartext `ws://` to a local or tailnet address is permitted by `usesCleartextTraffic`).
  private val client get() = OkHttpClientProvider.getOkHttpClient()

  override fun definition() = ModuleDefinition {
    Name("ArgoChannel")

    Events("channel")

    AsyncFunction("open") { id: String, request: OpenRecord, promise: Promise ->
      val url = request.url
      val timeoutMs = request.timeoutMs
      val headers = request.headers
      val channel = Channel(id) { event -> sendEvent("channel", event) }
      var settled = false

      val settle = { error: String? ->
        synchronized(channel) {
          if (!settled) {
            settled = true
            if (error == null) promise.resolve(null) else promise.reject("ERR_CHANNEL_OPEN", error, null)
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
          webSocket.close(1000, null)
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
      // `headers` ride on the WebSocket upgrade request, which is where the App offers compression: a Server built before it never reads them.
      val upgrade = Request.Builder().url(url).apply { headers.forEach { (name, value) -> header(name, value) } }.build()
      synchronized(channel) { channel.attach(timed.newWebSocket(upgrade, listener)) }
    }

    // A `ByteArray` is a `Uint8Array` on the JavaScript side.
    Function("write") { id: String, bytes: ByteArray -> channels[id]?.write(bytes) }

    Function("handOver") { id: String, record: HandOverRecord -> channels[id]?.handOver(record) }

    Function("send") { id: String, message: String -> channels[id]?.send(message) }

    Function("close") { id: String, code: Int, reason: String -> channels[id]?.close(code, reason) }
  }
}
