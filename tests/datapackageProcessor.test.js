import assert from "node:assert/strict";
import { test } from "node:test";
import { loadZenodoDatapackage } from "../src/lib/datapackageProcessor.js";

const record = {
  files: ["datapackage.json", "tags.csv"].map((key) => ({
    key,
    links: { self: `https://zenodo.org/api/records/123/files/${key}/content?download=1` },
  })),
};

for (const input of [
  { name: "share link", record: "https://zenodo.org/records/123?token=share-secret", token: "unused-personal-token" },
  { name: "DOI with personal token", record: "10.5281/zenodo.123", token: "personal-secret" },
  { name: "public record", record: "123" },
]) {
  test(`loads ${input.name} and authorizes every download`, async (t) => {
    const requests = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
      requests.push({ url: new URL(url), headers: options.headers });
      if (requests.length === 1) return Response.json(record);
      if (requests.length === 2) return Response.json({ resources: [{ name: "tags", path: "tags.csv" }] });
      return new Response("tag_id\n");
    });
    const result = await loadZenodoDatapackage(input);
    assert.equal(result.recordId, "123");
    assert.equal(requests.length, 3);
    for (const request of requests) {
      assert.equal(request.url.searchParams.get("token"), input.name === "share link" ? "share-secret" : null);
      assert.deepEqual(request.headers, input.name === "DOI with personal token" ? { Authorization: "Bearer personal-secret" } : {});
    }
    assert.equal(requests[1].url.searchParams.get("download"), "1");
    assert.doesNotMatch(JSON.stringify(result), /share-secret|personal-secret|unused-personal-token/);
  });
}

for (const failedRequest of [1, 2, 3]) {
  test(`failed request ${failedRequest} does not expose the share token`, async (t) => {
    let requests = 0;
    t.mock.method(globalThis, "fetch", async () => {
      requests += 1;
      if (requests === failedRequest) return new Response("", { status: 403 });
      if (requests === 1) return Response.json(record);
      return Response.json({ resources: [{ name: "tags", path: "tags.csv" }] });
    });
    await assert.rejects(
      loadZenodoDatapackage({ record: "https://zenodo.org/records/123?token=share-secret" }),
      (error) => error.message.includes("403") && !error.message.includes("share-secret"),
    );
  });
}
