jest.setTimeout(30000); // 20 seconds timeout

const nock = require("nock");
const mongoose = require("mongoose");
const { fetchRepos } = require("../src/fetchRepos");
const { Repo } = require("../src/db/models/Repo");

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/orgpulse_test");

});


afterAll(async () => {
  await mongoose.connection.db.dropDatabase(); // clears test DB
  await mongoose.disconnect();
});


beforeEach(async () => {
  await Repo.deleteMany({});
});

test("fetchRepos handles pagination and upserts correctly", async () => {
  nock("https://api.github.com")
    .get("/users/test-user/repos")
    .query({ per_page: 2, page: 1 })
    .reply(200, [
      { name: "repo1", stargazers_count: 5 },
      { name: "repo2", stargazers_count: 10 }
    ]);

  nock("https://api.github.com")
    .get("/users/test-user/repos")
    .query({ per_page: 2, page: 2 })
    .reply(200, []);

  await fetchRepos("test-user");

  const repos = await Repo.find({}).sort({ stars: -1 });
  expect(repos.length).toBe(2);
  expect(repos[0].name).toBe("repo2");
  expect(repos[1].name).toBe("repo1");
});
