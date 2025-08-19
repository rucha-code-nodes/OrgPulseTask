program
  .command("top")
  .requiredOption("--org <org>")
  .option("--metric <metric>", "stars or issues", "stars")
  .option("--limit <number>", "number of repos", 10)
  .action(async (options) => {
    const connectDB = require("../src/db/connect");
    const { getReposCollection } = require("../src/db/models/Repo");
    await connectDB();

    const collection = await getReposCollection();
    const repos = await collection
      .find({ org: options.org })
      .sort({ [options.metric]: -1 })
      .limit(parseInt(options.limit))
      .toArray();

    console.table(repos, ["name", "stars", "forks", "openIssues", "language"]);
    process.exit(0);
  });
