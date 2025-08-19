

# OrgPulse

OrgPulse is a CLI tool to fetch GitHub organization repos, analyze metrics, and sync them into MongoDB.

---

## 🚀 Setup / Run Steps

1. Clone the repo and install dependencies:

   ```bash
   git clone <repo-url>
   cd orgpulse
   npm install
   ```
2. Initialize indexes:

   ```bash
   node ./bin/orgpulse init
   ```
3. Run commands as shown in examples below.

---

## 📌 Command Examples

* **Initialize indexes**

  ```bash
  node ./bin/orgpulse init
  ```
* **Fetch repos for org**

  ```bash
  node ./bin/orgpulse fetch rucha-code-nodes
  ```
* **Show top repos by stars**

  ```bash
  node ./bin/orgpulse top --org rucha-code-nodes --metric stars --limit 5
  ```
* **Export repos to CSV**

  ```bash
  node ./bin/orgpulse export --org rucha-code-nodes --out repos.csv
  ```
* **Sync stars and forks later**

  ```bash
  node ./bin/orgpulse sync-stars --org rucha-code-nodes
  ```
* **Test MongoDB insert (optional)**

  ```bash
  node ./bin/orgpulse testdb
  ```
* **Run tests**

  ```bash
  npm test
  ```

---

## 🗂️ Short Field-Mapping Note

* Repo → stored as document in MongoDB.
* Fields mapped: `name`, `stars`, `forks`, `url`.
* CSV export includes same fields for easy analysis.

---

## 🐞 Debug Diary

* **Issue:** API rate limits → added sync option for stars/forks.
* **Issue:** MongoDB connection error → fixed by `.env` config.
* **Checkpointing:** Ensured pagination handled via cursors so large orgs can be processed in parts.

---

## ✍️ Pagination / Checkpoint Flow

![image alt](https://github.com/rucha-code-nodes/OrgPulseTask/blob/36a7f53670eb174c5a680f820ac6aa25190d57d8/Control_Flow.png)






