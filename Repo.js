const mongoose = require("mongoose");

// Repo schema
const repoSchema = new mongoose.Schema(
  {
    org: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    topics: [String],
    language: String,
    stars: Number,
    forks: Number,
    openIssues: Number,
    license: String,
    pushedAt: String,
  },
  { timestamps: true }
);

// Indexes
repoSchema.index({ org: 1, stars: -1 });
repoSchema.index({ org: 1, name: 1 }, { unique: true });

const Repo = mongoose.model("Repo", repoSchema);

// Upsert repo
async function upsertRepo(repo) {
  await Repo.updateOne({ org: repo.org, name: repo.name }, { $set: repo }, { upsert: true });
}

module.exports = { Repo, upsertRepo };
