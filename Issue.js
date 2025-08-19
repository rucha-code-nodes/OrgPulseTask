const mongoose = require("mongoose");

// Issue schema
const issueSchema = new mongoose.Schema(
  {
    repo: { type: String, required: true }, // e.g., org/repo
    number: { type: Number, required: true },
    title: String,
    state: String,
    createdAt: String,
  },
  { timestamps: true }
);

// Indexes
issueSchema.index({ repo: 1, state: 1 });
issueSchema.index({ repo: 1, number: 1 }, { unique: true });

const Issue = mongoose.model("Issue", issueSchema);

// Upsert issue
async function upsertIssue(issue) {
  await Issue.updateOne({ repo: issue.repo, number: issue.number }, { $set: issue }, { upsert: true });
}

module.exports = { Issue, upsertIssue };
