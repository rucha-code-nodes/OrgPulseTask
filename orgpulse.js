


const { program } = require("commander");
const connectDB = require("../src/db/connect");

const { Repo } = require("../src/db/models/Repo");
require('dotenv').config(); // Load .env variables

 



connectDB(); 

program
  .name("orgpulse")
  .description("CLI to fetch GitHub org data and store in MongoDB")
  .version("1.0.0");

program
  .command("hello")
  .description("Print hello world")
  .action(() => {
    console.log("Hello from OrgPulse CLI!");
  });


program
  .command("testdb")
  .description("Test MongoDB insert for repos & issues")
  .action(async () => {
     const connectDB = require("../src/db/connect");   
    const { upsertRepo } = require("../src/db/models/Repo");
    const { upsertIssue } = require("../src/db/models/Issue");

    try {
      
      await connectDB();

      // Insert fake repo
      await upsertRepo({
        org: "testorg",
        name: "testrepo",
        description: "This is a test repo",
        topics: ["nodejs", "cli"],
        language: "JavaScript",
        stars: 10,
        forks: 2,
        openIssues: 1,
        license: "MIT",
        pushedAt: new Date().toISOString(),
      });

      // Insert fake issue
      await upsertIssue({
        repo: "testorg/testrepo",
        number: 1,
        title: "Test Issue",
        state: "open",
        createdAt: new Date().toISOString(),
      });

      console.log("✅ Repo & Issue inserted successfully");
    } catch (err) {
      console.error("❌ Error running testdb:", err.message);
    } finally {
      process.exit(0);
    }
  });

  
program
  .command("init")
  .description("Connect to MongoDB and create indexes")
  .action(async () => {
    const connectDB = require("../src/db/connect");
    const { upsertRepo } = require("../src/db/models/Repo");
    const { upsertIssue } = require("../src/db/models/Issue");

    await connectDB();
    await upsertRepo({});   
    await upsertIssue({});  
    console.log("✅ Indexes ready");
    process.exit(0);
  });




  // Export repos to CSV
program
  .command("export")
  .requiredOption("--org <org>")
  .requiredOption("--out <file>")
  .description("Export repos for an org to a CSV file")
  .action(async (options) => {
    const connectDB = require("../src/db/connect");
    const createCsvWriter = require("csv-writer").createObjectCsvWriter;

    await connectDB();

    const repos = await Repo.find({ org: options.org }).lean(); 

    const csvWriter = createCsvWriter({
      path: options.out,
      header: [
        { id: "name", title: "name" },
        { id: "stars", title: "stars" },
        { id: "forks", title: "forks" },
        { id: "openIssues", title: "openIssues" },
        { id: "pushedAt", title: "pushedAt" },
        { id: "language", title: "language" },
      ],
    });

    await csvWriter.writeRecords(repos);
    console.log("✅ Export complete");
    process.exit(0);
  });



program
  .command("fetch <org>")
  .option("--since <date>", "Fetch repos updated since this date")
  .action(async (org, options) => {
    const connectDB = require("../src/db/connect");
    // const Repo = require("../src/db/models/Repo");
    const { Repo} = require("../src/db/models/Repo");

    // const Issue = require("../src/db/models/Issue");
    const { Issue} = require("../src/db/models/Issue");

    const axios = require("axios");
    // const pLimit = require("p-limit");
    const pLimit = require("p-limit").default;


    const fs = require("fs");

// Helper function
async function fetchWithRetry(url, headers, attempt = 1) {
  try {
    const res = await axios.get(url, { headers });
    return res;
  } catch (err) {
    const status = err.response ? err.response.status : null;

     if (status === 404) {
          console.log(`❌ Org "${org}" not found or no access. Stopping.`);
          return null; // Stop further processing
        }

    // Rate limit hit
    if ((status === 403 || status === 429) && err.response.headers["x-ratelimit-remaining"] === "0") {
      const reset = parseInt(err.response.headers["x-ratelimit-reset"]);
      const waitTime = (reset - Math.floor(Date.now() / 1000)) * 1000;
      console.log(`⚠ Rate limit hit, sleeping for ${waitTime / 1000}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      return fetchWithRetry(url, headers, attempt);
    }

    // Retry 3 times with exponential backoff
    if (attempt <= 3) {
      const backoff = Math.pow(3, attempt - 1) * 1000;
      console.log(`⚠ Retry #${attempt} after ${backoff / 1000}s...`);
      await new Promise(r => setTimeout(r, backoff));
      return fetchWithRetry(url, headers, attempt + 1);
    }

    throw err; // give up
  }
}

const token = process.env.GITHUB_TOKEN; // optional
const headers = token ? { Authorization: `token ${token}` } : {}; // <-- must be above
// Load checkpoint
let checkpoint = { lastRepo: null, lastPage: 1 };
if (fs.existsSync("checkpoint.json")) {
  checkpoint = JSON.parse(fs.readFileSync("checkpoint.json", "utf-8"));
}

let page = checkpoint.lastPage;
const perPage = 100; // number of repos per page
let repos = []; 

while (true) {
 // For personal account
 
const url = `https://api.github.com/users/rucha-code-nodes/repos?per_page=${perPage}&page=${page}`;

  const res = await fetchWithRetry(url, headers);
  if (!res.data.length) break;

  for (const r of res.data) {
    if (checkpoint.lastRepo && r.name <= checkpoint.lastRepo) continue; // skip already processed

    // Save repo to DB
    await Repo.updateOne(
      { org, name: r.name },
      {
        org,
        name: r.name,
        description: r.description,
        topics: r.topics || [],
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        openIssues: r.open_issues_count,
        license: r.license ? r.license.spdx_id : null,
        pushedAt: r.pushed_at,
      },
      { upsert: true }
    );

    checkpoint.lastRepo = r.name;
    fs.writeFileSync("checkpoint.json", JSON.stringify(checkpoint, null, 2));
  }

  page++;
  checkpoint.lastPage = page;
  fs.writeFileSync("checkpoint.json", JSON.stringify(checkpoint, null, 2));
}


    console.log("Repos saved. Now fetching issues...");

    
    const limit = pLimit(5); // 5 concurrent requests
    for (const r of repos) {
      await limit(async () => {
        const issuesUrl = `https://api.github.com/repos/${org}/${r.name}/issues?state=all&per_page=30`;
        const res = await axios.get(issuesUrl, { headers });
        const issues = res.data.map(i => ({
          repo: `${org}/${r.name}`,
          number: i.number,
          title: i.title,
          state: i.state,
          createdAt: i.created_at,
        }));
        for (const issue of issues) {
          await Issue.updateOne(
            { repo: issue.repo, number: issue.number },
            issue,
            { upsert: true }
          );
        }
      });
    }

    console.log("✅ Fetch complete");
    process.exit(0);
  });



  program
  .command("top")
  .requiredOption("--org <org>")
  .option("--metric <metric>", "stars or issues", "stars")
  .option("--limit <n>", "number of repos", 10)
  .action(async (options) => {
    const connectDB = require("../src/db/connect");
    // const Repo = require("../src/db/models/Repo");
    const { Repo } = require("../src/db/models/Repo");


    await connectDB();

    let repos = await Repo.find({ org: options.org }).lean();

    if (options.metric === "issues") {
      repos.forEach(r => r.metricValue = r.openIssues);
    } else {
      repos.forEach(r => r.metricValue = r.stars);
    }

    repos.sort((a, b) => b.metricValue - a.metricValue);

    const top = repos.slice(0, options.limit);

    console.table(top.map(r => ({
      name: r.name,
      stars: r.stars,
      openIssues: r.openIssues,
      forks: r.forks,
      language: r.language
    })));

    process.exit(0);
  });



  program
  .command("sync-stars")
  .requiredOption("--org <org>")
  .action(async (options) => {
    const connectDB = require("../src/db/connect");
    const { Repo } = require("../src/db/models/Repo");
    const axios = require("axios");

    await connectDB();

    const token = process.env.GITHUB_TOKEN;
    const headers = token ? { Authorization: `token ${token}` } : {};

    const repos = await Repo.find({ org: options.org }).lean();

    for (const r of repos) {
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${options.org}/${r.name}`,
          { headers }
        );

        await Repo.updateOne(
          { org: options.org, name: r.name },
          {
            stars: res.data.stargazers_count,
            forks: res.data.forks_count,
          }
        );
      } catch (err) {
        // silently skip errors, or you can log minimally if needed
        console.warn(`⚠ Failed to update ${r.name}: ${err.message}`);
      }
    }

    console.log("✅ Stars & forks updated");
    process.exit(0);
  });






program.parse(process.argv);
