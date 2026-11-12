import assert from "node:assert/strict";
import test from "node:test";
import { XAdapter } from "../src/providers/x/adapter.js";
import { temporaryStore, xCredential } from "./helpers.js";

test("X runtime snake_case content preserves text, edits, reactions, replies and shared posts", async () => {
  const { store } = await temporaryStore("dmbridge-x-shapes-");
  const adapter = new XAdapter(xCredential(), "personal", store);
  const internal = adapter as unknown as {
    usersFromIncludes(value: unknown): unknown;
    normalizeEvent(event: unknown, original: undefined, conversationID: string): { type: string; text: string; senderUsername: string; providerData: Record<string, unknown>; attachments: { type: string; sourceURL: string }[]; replyToMessageID: string; reactions: unknown[] };
  };
  internal.usersFromIncludes({ users: [{ id: "222", username: "friend", name: "Friend", profile_image_url: "https://pbs.twimg.com/profile_images/example.jpg" }] });
  const event = { type: "message", id: "900", senderId: "222", conversationId: "111-222", createdAtMsec: 1760313600000 };
  const normalize = (content: unknown) => internal.normalizeEvent({ ...event, content }, undefined, "111-222");
  for (const content of [{ content_type: "text", text: "Hello" }, { contentType: "text", text: "Hello" }]) {
    const message = normalize(content);
    assert.equal(message.type, "text"); assert.equal(message.text, "Hello"); assert.equal(message.senderUsername, "friend");
    assert.deepEqual(message.providerData.sender, { username: "friend", displayName: "Friend", profilePictureURL: "https://pbs.twimg.com/profile_images/example.jpg" });
  }
  const edit = normalize({ content_type: "edit", new_text: "Changed", target_message_id: "800" });
  assert.equal(edit.text, "Changed"); assert.equal(edit.providerData.targetMessageID, "800");
  for (const content_type of ["reaction", "reactionRemoved"]) {
    const reaction = normalize({ content_type, emoji: "❤️", target_message_id: "800" });
    assert.equal(reaction.type, "system"); assert.equal(reaction.providerData.targetMessageID, "800");
  }
  const shared = normalize({ content_type: "text", text: "", attachments: [{ attachment_type: "post", postUrl: "https://x.com/example/status/123", restId: "123" }], replying_to_preview: { message_id: "800" } });
  assert.equal(shared.type, "sharedPost"); assert.equal(shared.attachments[0]?.sourceURL, "https://x.com/example/status/123"); assert.ok(shared.replyToMessageID);
});
