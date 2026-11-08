import test from "node:test";
import assert from "node:assert/strict";
import { authSessionErrorStatus } from "../lib/auth-errors.js";

test("auth transport failures become 503", () => {
  assert.equal(authSessionErrorStatus({ code: "NETWORK_DNS" }), 503);
  assert.equal(authSessionErrorStatus({ status: 502 }), 503);
  assert.equal(authSessionErrorStatus({ status: 503 }), 503);
});

test("unexpected internal failures become 500", () => {
  assert.equal(authSessionErrorStatus(new Error("unexpected")), 500);
  assert.equal(authSessionErrorStatus({ code: "23505" }), 500);
  assert.equal(authSessionErrorStatus({ status: 500 }), 500);
});
