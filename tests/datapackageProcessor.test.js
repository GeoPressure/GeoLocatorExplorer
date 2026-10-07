import assert from "node:assert/strict";
import { test, vi } from "vitest";
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
  test(`loads ${input.name} and authorizes every download`, async () => {
    const requests = [];
    vi.spyOn(globalThis, "fetch").mockImplementation( async (url, options) => {
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
  test(`failed request ${failedRequest} does not expose the share token`, async () => {
    let requests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation( async () => {
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

test("imports nested resource paths and quoted CSV fields", async () => {
  const resources = {
    "tags.csv": 'tag_id,scientific_name,tag_comments\r\nbird,Ficedula hypoleuca,"first line, with comma\nsecond line ""quoted"""\r\n',
    "staps.csv": "tag_id,stap_id,start,end\nbird,1,2024-01-01,2024-01-03\n",
    "paths.csv": "tag_id,stap_id,type,lat,lon\nbird,1,most_likely,52,-3\n",
  };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/123")) return Response.json({ files: ["datapackage.json", ...Object.keys(resources)].map((key) => ({ key: `data/${key}`, links: { self: `https://zenodo.org/api/records/123/files/data/${key}/content` } })) });
    if (path.endsWith("datapackage.json/content")) return Response.json({ resources: Object.keys(resources).map((key) => ({ name: key.split(".")[0], path: `data/${key}` })) });
    return new Response(resources[path.split("/").at(-2)]);
  });
  const result = await loadZenodoDatapackage({ record: "123" });
  assert.equal(result.tags.length, 1);
  assert.equal(result.tagDataById.bird.tag_comments, 'first line, with comma\nsecond line "quoted"');
  assert.deepEqual(result.projectData.tags[0].staps[0], {
    stap_id: "1", longitude: -3, latitude: 52, duration_days: 2,
    start: "2024-01-01T00:00:00Z", end: "2024-01-03T00:00:00Z",
  });
});
