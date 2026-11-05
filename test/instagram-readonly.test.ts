import assert from "node:assert/strict";
import test from "node:test";

import { InstagramAdapter } from "../src/providers/instagram/adapter.js";
import {
  instagramCredential,
  jsonResponse,
  listOptions,
  pageOptions,
  mockRoutes,
} from "./helpers.js";

test("authenticated Instagram account lists and reads conversations without mutations", async (t) => {
  const calls = mockRoutes(
    t,
    {
      "GET /me?": { user_id: "self", username: "owner" },
      "GET /conversation-1/messages?": {
        data: [
          {
            id: "message-1",
            created_time: "2026-10-13T00:00:00Z",
            from: { id: "other", username: "friend" },
            message: "hello",
          },
        ],
      },
      "GET /conversation-1?": {
        id: "conversation-1",
        participants: {
          data: [
            { id: "self", username: "owner" },
            { id: "other", username: "friend" },
          ],
        },
      },
    },
    {
      data: [
        {
          id: "conversation-1",
          updated_time: "2026-10-13T00:00:00Z",
          participants: {
            data: [
              { id: "self", username: "owner" },
              { id: "other", username: "friend" },
            ],
          },
        },
      ],
    },
  );

  const adapter = new InstagramAdapter(instagramCredential(), "personal");
  const conversations = await adapter.listConversations(listOptions());
  assert.equal(conversations.items[0]?.conversationID, "conversation-1");
  const messages = await adapter.listMessages(
    pageOptions({ conversationID: "conversation-1" }),
  );
  assert.equal(messages.items[0]?.messageID, "message-1");
  const messageRequests = await adapter.listMessageRequests(
    pageOptions({ category: "requests" }),
  );
  assert.equal(messageRequests.items[0]?.requestID, "conversation-1");
  assert.equal(messageRequests.items[0]?.category, "requests");
  assert.equal(messageRequests.items[0]?.detailReadMarksDelivered, false);
  assert.equal(new URL(calls.at(-1)?.url ?? "").searchParams.get("folder"), "requests");
  assert.ok(calls.every(({ method }) => method === "GET"));
});

test("Instagram conversation lookup falls back to the supported conversation list", async (t) => {
  const calls = mockRoutes(t, {
    "GET /me?": { user_id: "self", username: "owner" },
    "GET /conversation-1?": jsonResponse(
      { error: { message: "Unsupported get request." } },
      400,
    ),
    "GET /self/conversations?": ({ url }: { url: string }) => {
      const parameters = new URL(url).searchParams;
      const fields = parameters.get("fields") ?? "";
      const secondPage = fields.includes(".after(page-2)");
      const filtered = parameters.has("user_id");
      return {
        data: [
          {
            id: filtered ? "filtered-conversation-1" : "conversation-1",
            updated_time: "2026-10-13T00:00:00Z",
            participants: {
              data: [
                { id: "self", username: "owner" },
                { id: "other", username: "friend" },
              ],
            },
            messages: {
              data: [
                secondPage
                  ? {
                      id: "message-2",
                      created_time: "2026-10-12T00:00:00Z",
                      from: { id: "other", username: "friend" },
                      message: "again",
                    }
                  : {
                      id: "message-1",
                      created_time: "2026-10-13T00:00:00Z",
                      from: { id: "other", username: "friend" },
                      message: "hello",
                    },
              ],
              ...(secondPage
                ? {}
                : {
                    paging: {
                      cursors: { after: "page-2" },
                      next: "https://graph.instagram.com/messages-next",
                    },
                  }),
            },
          },
        ],
      };
    },
  });

  const adapter = new InstagramAdapter(instagramCredential(), "personal");
  const conversation = await adapter.getConversation("conversation-1");
  assert.equal(conversation.conversationID, "conversation-1");
  const first = await adapter.listMessages(
    pageOptions({ conversationID: "conversation-1", limit: 1 }),
  );
  assert.equal(first.items[0]?.messageID, "message-1");
  assert.equal(first.nextCursor, "page-2");
  const second = await adapter.listMessages(
    pageOptions({
      conversationID: "conversation-1",
      cursor: first.nextCursor,
      limit: 1,
    }),
  );
  assert.equal(second.items[0]?.messageID, "message-2");
  assert.equal(second.nextCursor, null);
  assert.ok(calls.every(({ method }) => method === "GET"));
});
