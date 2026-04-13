#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

loadPerfEnvFiles();

const BASE_URL = process.env.PERF_BASE_URL || "http://localhost:3001";
const YEAR = process.env.PERF_YEAR || String(new Date().getFullYear());
const MONTH = process.env.PERF_MONTH || String(new Date().getMonth() + 1);
const TIMEOUT_MS = process.env.PERF_TIMEOUT_MS || "15000";
const SCENARIOS = [
  { name: "Beban Rendah", concurrency: 1, requests: 30 },
  { name: "Beban Sedang", concurrency: 5, requests: 50 },
  { name: "Beban Tinggi", concurrency: 10, requests: 100 },
  { name: "Beban Sangat Tinggi", concurrency: 20, requests: 200 },
];
const ROLES = ["siswa", "guru", "admin", "kantin"];
const REPORTS_DIR = join(process.cwd(), "reports", "perf");

main();

function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  const timestamp = createTimestamp();
  const runResults = [];

  console.log(`\n=== SEHATI Perf Report Runner ===`);
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Periode  : ${YEAR}-${String(MONTH).padStart(2, "0")}`);
  console.log(`Output   : ${REPORTS_DIR}`);

  for (const scenario of SCENARIOS) {
    for (const role of ROLES) {
      console.log(`\nMenjalankan ${scenario.name} | role=${role} | concurrency=${scenario.concurrency} | requests=${scenario.requests}`);
      const result = runPerfRole(scenario, role);
      runResults.push({
        scenario: scenario.name,
        role,
        endpoint: endpointLabel(role),
        ...result,
      });
      console.log(
        `Selesai | success=${result.successRate.toFixed(2)}% | avg=${result.latency.avg.toFixed(2)} ms | p95=${result.latency.p95.toFixed(2)} ms | req/s=${result.throughput.toFixed(2)}`,
      );
    }
  }

  const files = writeReports(timestamp, runResults);
  console.log(`\nLaporan tersimpan:`);
  for (const file of files) {
    console.log(`- ${file}`);
  }
}

function runPerfRole(scenario, role) {
  const env = {
    ...process.env,
    PERF_OUTPUT: "json",
    PERF_BASE_URL: BASE_URL,
    PERF_YEAR: YEAR,
    PERF_MONTH: MONTH,
    PERF_TIMEOUT_MS: TIMEOUT_MS,
    PERF_ROLE: role,
    PERF_CONCURRENCY: String(scenario.concurrency),
    PERF_REQUESTS: String(scenario.requests),
  };

  const child = spawnSync(process.execPath, ["scripts/perf-test.mjs", "role"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });

  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout || `Perf test gagal untuk role ${role}`);
  }

  const jsonText = extractJsonBlock(child.stdout);
  if (!jsonText) {
    throw new Error(`Output JSON tidak ditemukan untuk role ${role}`);
  }

  return JSON.parse(jsonText);
}

function extractJsonBlock(output) {
  const lines = output.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().startsWith("{"));
  if (startIndex === -1) return "";
  return lines.slice(startIndex).join("\n").trim();
}

function writeReports(timestamp, results) {
  const jsonPath = join(REPORTS_DIR, `perf-report-${timestamp}.json`);
  const csvPath = join(REPORTS_DIR, `perf-report-${timestamp}.csv`);
  const mdPath = join(REPORTS_DIR, `perf-report-${timestamp}.md`);

  writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");
  writeFileSync(csvPath, toCsv(results), "utf8");
  writeFileSync(mdPath, toMarkdown(results), "utf8");

  return [jsonPath, csvPath, mdPath];
}

function toCsv(results) {
  const headers = [
    "scenario",
    "role",
    "endpoint",
    "concurrency",
    "maxRequests",
    "successRate",
    "errorRate",
    "throughput",
    "latencyAvgMs",
    "latencyP95Ms",
    "latencyP99Ms",
    "completed",
    "failed",
    "statusCounts",
  ];

  const rows = results.map((item) => [
    item.scenario,
    item.role,
    item.endpoint,
    item.concurrency,
    item.maxRequests,
    item.successRate.toFixed(2),
    item.errorRate.toFixed(2),
    item.throughput.toFixed(2),
    item.latency.avg.toFixed(2),
    item.latency.p95.toFixed(2),
    item.latency.p99.toFixed(2),
    item.completed,
    item.failed,
    formatStatusCounts(item.statusCounts),
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function toMarkdown(results) {
  const lines = [
    "# Laporan Pengujian Performa Backend",
    "",
    `Periode dashboard siswa: ${YEAR}-${String(MONTH).padStart(2, "0")}`,
    "",
    "| No | Skenario | Role | Endpoint | Concurrency | Request | Success Rate | Avg Latency (ms) | P95 (ms) | P99 (ms) | Throughput (req/s) | Error Rate |",
    "|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];

  results.forEach((item, index) => {
    lines.push(
      `| ${index + 1} | ${item.scenario} | ${item.role} | \`${item.endpoint}\` | ${item.concurrency} | ${item.maxRequests} | ${item.successRate.toFixed(2)}% | ${item.latency.avg.toFixed(2)} | ${item.latency.p95.toFixed(2)} | ${item.latency.p99.toFixed(2)} | ${item.throughput.toFixed(2)} | ${item.errorRate.toFixed(2)}% |`,
    );
  });

  return lines.join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function endpointLabel(role) {
  switch (role) {
    case "siswa":
      return "/api/dashboard/siswa";
    case "guru":
      return "/api/guru/dashboard/profil";
    case "admin":
      return "/api/admin/dashboard";
    case "kantin":
      return "/api/kantin/dashboard";
    default:
      return "-";
  }
}

function formatStatusCounts(statusCounts) {
  return Object.entries(statusCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([status, count]) => `${status}=${count}`)
    .join("; ");
}

function createTimestamp() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function loadPerfEnvFiles() {
  const cwd = process.cwd();
  const candidates = [
    ".env.perf.local",
    ".env.perf",
    ".env.local",
    ".env",
  ].map((name) => join(cwd, name));

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    applyEnvContent(content);
  }
}

function applyEnvContent(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] != null) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value.replace(/\\n/g, "\n");
  }
}
