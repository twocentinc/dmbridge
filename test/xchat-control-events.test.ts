import assert from "node:assert/strict";
import test from "node:test";
import type { Event } from "@xdevplatform/chat-xdk";
import { recoverControlEvent } from "../src/providers/x/control-events.js";
import { readThrift } from "../src/providers/x/thrift.js";
import { XAdapter } from "../src/providers/x/adapter.js";
import { temporaryStore, xCredential } from "./helpers.js";

const accepted = Buffer.from("0c00010c000d000000", "hex");
const field = (type: number, id: number, bytes: Buffer) => {
  const header = Buffer.alloc(3); header[0] = type; header.writeInt16BE(id, 1);
  return Buffer.concat([header, bytes]);
};
const binary = (bytes: Buffer) => {
  const size = Buffer.alloc(4); size.writeInt32BE(bytes.length); return Buffer.concat([size, bytes]);
};
const original = (payload: Buffer, encrypted = false) =>
  field(12, 7, field(12, 1, Buffer.concat([
    field(11, 100, binary(payload)),
    ...(encrypted ? [field(11, 101, binary(Buffer.from("1")))] : []),
    Buffer.alloc(3),
  ]))).toString("base64");
const event = { type: "message", id: "1", conversationId: "example", verified: true, content: { content_type: "unknown" } } as unknown as Event;

test("recover only exact verified request-acceptance events, plaintext and encrypted", async () => {
  const chat = { decrypt: () => accepted.toString("utf8") };
  for (const encoded of [original(accepted), original(Buffer.from("ciphertext"), true)]) {
    const recovered = recoverControlEvent(event, encoded, chat, { "1": new Uint8Array(32) });
    assert.equal(recovered.content?.contentType, "acceptMessageRequest");
    const { store } = await temporaryStore("x-control-");
    const adapter = new XAdapter(xCredential(), "personal", store);
    const normalized = (adapter as any).normalizeEvent(recovered, encoded, "example");
    assert.equal(normalized.type, "system");
    assert.equal(normalized.providerType, "acceptMessageRequest");
    assert.equal(normalized.text, null);
  }
});
test("unrecognized, malformed, unverified and undecryptable events stay unknown", () => {
  const chat = { decrypt: () => { throw Error("decrypt failed"); } };
  for (const encoded of [undefined, "!", original(Buffer.from("0c00010c000e000000", "hex")), original(Buffer.from("ciphertext"), true), original(Buffer.concat([accepted, Buffer.from([0])]))]) {
    assert.equal(recoverControlEvent(event, encoded, chat, {}), event);
  }
  const unverified = { ...event, verified: false };
  assert.equal(recoverControlEvent(unverified, original(accepted), chat, {}), unverified);
  const text = { ...event, content: { contentType: "text", text: "hello" } } as Event;
  assert.equal(recoverControlEvent(text, original(accepted), chat, {}), text);
});
test("Thrift reader rejects truncated, trailing, oversized and recursive input", () => {
  for (const bytes of [Buffer.from([12]), Buffer.from([0, 0]), Buffer.from("0b00017fffffff", "hex"), Buffer.concat([Buffer.from("0c0001".repeat(40), "hex"), Buffer.alloc(41)])]) {
    assert.throws(() => readThrift(bytes));
  }
});
