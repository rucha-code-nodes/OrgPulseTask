const { mapRepo } = require("../src/mapRepo");

test("mapRepo converts API JSON to repoDoc correctly", () => {
  const apiJson = {
    name: "test-repo",
    description: "Sample repo",
    topics: ["node", "js"],
    language: "JavaScript",
    stargazers_count: 5,
    forks_count: 2,
    open_issues_count: 1,
    license: { spdx_id: "MIT" },
    pushed_at: "2025-08-17T10:00:00Z"
  };

  const expected = {
    name: "test-repo",
    description: "Sample repo",
    topics: ["node", "js"],
    language: "JavaScript",
    stars: 5,
    forks: 2,
    openIssues: 1,
    license: "MIT",
    pushedAt: "2025-08-17T10:00:00Z"
  };

  expect(mapRepo(apiJson)).toEqual(expected);
});
