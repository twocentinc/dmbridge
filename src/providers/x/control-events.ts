import { Buffer } from "node:buffer";
import type { ChatWithJuicebox, ConversationKeyMap, Event } from "@xdevplatform/chat-xdk";
import { readThrift } from "./thrift.js";

// chat-xdk 0.5 (and 0.7) drops AcceptMessageRequest into Unknown. Decode only
// the exact empty Thrift variant defined by X's product.thrift (union tag 13).
// Never infer control events from missing text or shouldNotify=false.
export function recoverControlEvent(
  event: Event, original: string | undefined,
  chat: Pick<ChatWithJuicebox, "decrypt">, keys: ConversationKeyMap,
): Event {
  const content = event.content as { contentType?: string; content_type?: string } | undefined;
  if (event.type !== "message" || event.verified !== true ||
      (content?.contentType ?? content?.content_type) !== "unknown" || !original) return event;
  try {
    if (original.length > 2_000_000) return event;
    const raw = readThrift(Buffer.from(original, "base64"));
    const create = raw[7]?.type === 12 && raw[7].value[1]?.type === 12
      ? raw[7].value[1].value : undefined;
    if (create?.[100]?.type !== 11 || create[112]?.value > 0) return event;
    const encrypted: Buffer = create[100].value;
    const version = create[101];
    if (version && version.type !== 11) return event;
    const keyVersion = version?.value.toString("utf8");
    // This variant's nine bytes are all ASCII, so the SDK's UTF-8 decrypt
    // preserves them exactly. Other binary payloads remain unknown.
    const plaintext = keyVersion
      ? Buffer.from(chat.decrypt(encrypted.toString("base64"), keys[keyVersion]!), "utf8")
      : encrypted;
    if (!plaintext.equals(Buffer.from("0c00010c000d000000", "hex"))) return event;
    return { ...event, content: { contentType: "acceptMessageRequest" } } as Event;
  } catch {
    return event;
  }
}
