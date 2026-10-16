# Notifications

Session supplies its pending Input request. Feed names the live Turn endings in each Writer commit; recovered and archive-settled endings never reach Notifications. Notifications does not scan historical Feed pages or infer events from Session list status.

The Engine combines attention from actual App Connections for this Server. A viewed Session stays quiet everywhere. Attention expires after 30 seconds without a report. Apps renew attention every 15 seconds and report navigation, focus and visibility changes immediately. Disconnect or stream cancellation removes that Connection's attention.

Delivery is live and scoped to one Connection. Each stream starts at the present, including after reconnect or Engine restart. Events without a connected recipient have no desktop delivery. This module supplies no offline phone outbox.

Each recipient has an ordered queue of at most 64 events. Unacknowledged events retry every two seconds and expire after one minute. A full queue expires its oldest event. Disconnect expires the queue. Expiry is not a delivery acknowledgement.

The App acknowledges only after its desktop delivery implementation accepts an event. A failed delivery remains unacknowledged for retry. A lost acknowledgement retries the same event identity, and the App acknowledges it again without showing a second notification.

Attention is checked when the Engine accepts an event and before each delivery attempt. Suppressed events do not reappear after navigation. Archived Sessions and Subagents do not produce notifications.

Attention starts when an App can identify the Session it shows. An immediate first Turn can end while the App still shows New Session, before navigation to the created Session. That event can notify.

Events carry a stable Server identity from SQLite and a Session-scoped Turn or request identity. Server identity initialization uses the existing Writer. The Connection context supplies recipient identity. Apps cannot choose another Connection's identity.

Phone delivery can later consume the same domain facts and suppression policy. Persistent phone destinations, credentials, provider delivery, retention and offline retries remain separate work.
