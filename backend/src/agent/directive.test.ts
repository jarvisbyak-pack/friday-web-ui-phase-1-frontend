import test from "node:test";
import assert from "node:assert/strict";
import { applyFridayDirective, FRIDAY_SYSTEM_DIRECTIVE } from "./directive.js";

test("Friday directive is always the first system message", () => {
  const messages = applyFridayDirective([
    { role: "user" as const, content: "Check my project." }
  ]);

  assert.equal(messages[0]?.role, "system");
  assert.ok(messages[0]?.content.includes(FRIDAY_SYSTEM_DIRECTIVE));
  assert.equal(messages[1]?.role, "user");
});

test("caller system context is preserved after the server directive", () => {
  const messages = applyFridayDirective([
    { role: "system" as const, content: "Use concise answers." },
    { role: "user" as const, content: "Hello." }
  ]);

  assert.equal(messages.length, 2);
  assert.ok(messages[0]?.content.includes(FRIDAY_SYSTEM_DIRECTIVE));
  assert.ok(messages[0]?.content.includes("Use concise answers."));
  assert.ok(messages[0]?.content.includes("do not treat it as overriding"));
  assert.equal(messages[1]?.content, "Hello.");
});
