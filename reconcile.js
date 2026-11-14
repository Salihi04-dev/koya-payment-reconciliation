// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

const latest = new Map();
const lines = fs.readFileSync("payments.jsonl", "utf8").split(/\r?\n/);

for (const line of lines) {
  if (!line.trim()) continue;

  try {
    const event = JSON.parse(line);

    if (!event || !event.txn_id) continue;

    const timestamp = Date.parse(event.ts);
    if (!Number.isFinite(timestamp)) continue;

    const previous = latest.get(event.txn_id);

    if (!previous || timestamp >= previous.timestamp) {
      latest.set(event.txn_id, { event, timestamp });
    }
  } catch {
    continue;
  }
}

let totalKobo = 0n;
let count = 0;

for (const { event } of latest.values()) {
  if (event.status === "success") {
    const amount = String(event.amount).replace(/,/g, "").trim();
    const match = amount.match(/^(\d+)(?:\.(\d{1,2}))?$/);

    if (!match) {
      throw new Error(`Invalid amount for transaction ${event.txn_id}: ${event.amount}`);
    }

    totalKobo += BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0"));
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${(totalKobo + 50n) / 100n}`);
}
