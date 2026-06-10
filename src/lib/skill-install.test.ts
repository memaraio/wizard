import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderSkillTemplate } from "./skill-install.js";

describe("skill-install", () => {
  it("renderSkillTemplate substitutes connector name", () => {
    const out = renderSkillTemplate(
      "Use {{CONNECTOR_NAME}}:store_memory and {{CONNECTOR_NAME}} again",
      "Memara",
    );
    assert.equal(out, "Use Memara:store_memory and Memara again");
  });
});
