#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

loadPerfEnvFiles();

const profile = (process.argv[2] || "health").toLowerCase();

const BASE_URL = (process.env.PERF_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const CONCURRENCY = toPositiveInt(process.env.PERF_CONCURRENCY, 10);
const DURATION_SECONDS = toPositiveInt(process.env.PERF_DURATION, 20);
const MAX_REQUESTS = toPositiveInt(process.env.PERF_REQUESTS, 0);
const REQUEST_TIMEOUT_MS = toPositiveInt(process.env.PERF_TIMEOUT_MS, 15000);
const YEAR = toPositiveInt(process.env.PERF_YEAR, new Date().getFullYear());
const MONTH = toPositiveInt(process.env.PERF_MONTH, new Date().getMonth() + 1);
const ROLE = process.env.PERF_ROLE || "siswa";
const IDENTIFIER = process.env.PERF_IDENTIFIER || "";
const PASSWORD = process.env.PERF_PASSWORD || "";
const TOKEN = process.env.PERF_TOKEN || "";
const OUTPUT_MODE = (process.env.PERF_OUTPUT || "text").toLowerCase();
const ROLE_CONFIGS = {
  siswa: {
    endpoint: ({ baseUrl, year, month }) =>
      `${baseUrl}/api/dashboard/siswa?mode=month&year=${year}&month=${month}`,
    identifier: process.env.PERF_SISWA_IDENTIFIER || "",
    password: process.env.PERF_SISWA_PASSWORD || "",
  },
  guru: {
    endpoint: ({ baseUrl }) => `${baseUrl}/api/guru/dashboard/profil`,
    identifier: process.env.PERF_GURU_IDENTIFIER || "",
    password: process.env.PERF_GURU_PASSWORD || "",
  },
  admin: {
    endpoint: ({ baseUrl }) => `${baseUrl}/api/admin/dashboard`,
    identifier: process.env.PERF_ADMIN_IDENTIFIER || "",
    password: process.env.PERF_ADMIN_PASSWORD || "",
  },
  kantin: {
    endpoint: ({ baseUrl }) => `${baseUrl}/api/kantin/dashboard`,
    identifier: process.env.PERF_KANTIN_IDENTIFIER || "",
    password: process.env.PERF_KANTIN_PASSWORD || "",
  },
};

const REQUEST_BUILDERS = {
  health: buildHealthRequest,
  login: buildLoginRequest,
  dashboard: buildDashboardRequest,
  role: buildRoleRequest,
};

async function main() {
  if (profile === "all") {
    await runAllRoles();
    return;
  }

  const buildRequest = REQUEST_BUILDERS[profile];
  if (!buildRequest) {
    throw new Error(
      `Profile "${profile}" tidak dikenal. Gunakan salah satu: ${[
        ...Object.keys(REQUEST_BUILDERS),
        "all",
      ].join(", ")}`,
    );
  }

  const context = {
    baseUrl: BASE_URL,
    year: YEAR,
    month: MONTH,
    role: ROLE,
    identifier: IDENTIFIER,
    password: PASSWORD,
    token: TOKEN,
  };

  console.log(`\n=== SEHATI Backend Performance Test ===`);
  console.log(`Profile     : ${profile}`);
  console.log(`Base URL    : ${BASE_URL}`);
  console.log(`Concurrency : ${CONCURRENCY}`);
  console.log(`Duration    : ${DURATION_SECONDS}s`);
  console.log(`Max reqs    : ${MAX_REQUESTS > 0 ? MAX_REQUESTS : "unlimited (selama durasi)"}`);
  console.log(`Timeout     : ${REQUEST_TIMEOUT_MS}ms`);

  if (profile === "dashboard") {
    console.log(`Dashboard   : year=${YEAR}, month=${MONTH}`);
  }

  if (profile === "role") {
    console.log(`Role        : ${ROLE}`);
  }

  const stopAt = Date.now() + DURATION_SECONDS * 1000;
  const metrics = {
    startedAt: Date.now(),
    completed: 0,
    failed: 0,
    latencies: [],
    bytes: 0,
    statuses: new Map(),
    errors: [],
    requestCounter: 0,
    fatalError: false,
  };

  const workers = Array.from({ length: CONCURRENCY }, (_, index) =>
    runWorker(index + 1, stopAt, context, buildRequest, metrics),
  );

  await Promise.all(workers);
  const summary = buildSummary(metrics);
  printSummary(summary);

  if (OUTPUT_MODE === "json") {
    process.stdout.write(`${JSON.stringify(buildSerializableSummary(summary, context, profile), null, 2)}\n`);
  }
}

async function runWorker(workerId, stopAt, context, buildRequest, metrics) {
  while (Date.now() < stopAt) {
    if (metrics.fatalError) {
      return;
    }

    if (MAX_REQUESTS > 0 && metrics.requestCounter >= MAX_REQUESTS) {
      return;
    }

    try {
      metrics.requestCounter += 1;
      const requestConfig = await buildRequest(context);
      const result = await executeRequest(requestConfig);
      metrics.completed += 1;
      metrics.latencies.push(result.durationMs);
      metrics.bytes += result.bytes;
      metrics.statuses.set(
        result.status,
        (metrics.statuses.get(result.status) || 0) + 1,
      );

      if (result.status >= 400 && metrics.errors.length < 5) {
        metrics.errors.push(
          `[HTTP ${result.status}] ${requestConfig.method} ${requestConfig.url} :: ${truncate(result.body, 220)}`,
        );
      }
    } catch (error) {
      metrics.failed += 1;
      if (metrics.errors.length < 5) {
        const message = error instanceof Error ? error.message : String(error);
        metrics.errors.push(`[Worker ${workerId}] ${message}`);
      }

      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("belum lengkap") ||
        message.includes("tidak didukung") ||
        message.includes("tidak dikenal")
      ) {
        metrics.fatalError = true;
        return;
      }
    }
  }
}

async function executeRequest({ url, method = "GET", headers = {}, body }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const responseText = await response.text();
    const durationMs = performance.now() - startedAt;

    return {
      status: response.status,
      durationMs,
      bytes: Buffer.byteLength(responseText, "utf8"),
      body: responseText,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildHealthRequest({ baseUrl }) {
  return {
    url: `${baseUrl}/api/health/check`,
    method: "GET",
    headers: { accept: "application/json" },
  };
}

function buildLoginRequest({ baseUrl, role, identifier, password }) {
  if (!identifier || !password) {
    throw new Error(
      "Profile login butuh PERF_IDENTIFIER dan PERF_PASSWORD.",
    );
  }

  return {
    url: `${baseUrl}/api/auth/login`,
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ role, identifier, password }),
  };
}

async function buildDashboardRequest(context) {
  const token = context.token || (await fetchAuthToken(context));

  return {
    url: `${context.baseUrl}/api/dashboard/siswa?mode=month&year=${context.year}&month=${context.month}`,
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  };
}

async function buildRoleRequest(context) {
  const config = ROLE_CONFIGS[context.role];
  if (!config) {
    throw new Error(`Role "${context.role}" tidak didukung. Gunakan siswa, guru, admin, atau kantin.`);
  }

  const token = context.token || (await fetchAuthTokenForRole(context, context.role));

  return {
    url: config.endpoint(context),
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  };
}

async function fetchAuthToken(context) {
  if (context.cachedToken) {
    return context.cachedToken;
  }

  const loginRequest = buildLoginRequest(context);
  const result = await executeRequest(loginRequest);
  if (result.status >= 400) {
    throw new Error(
      `Gagal login untuk profile dashboard. Status ${result.status}. Body: ${truncate(result.body, 220)}`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    throw new Error("Response login bukan JSON yang valid.");
  }

  const token = parsed?.data?.token;
  if (!token) {
    throw new Error("Token login tidak ditemukan pada response auth.");
  }

  context.cachedToken = token;
  return token;
}

async function fetchAuthTokenForRole(context, role) {
  context.roleTokenCache ||= {};

  if (context.roleTokenCache[role]) {
    return context.roleTokenCache[role];
  }

  const roleConfig = ROLE_CONFIGS[role];
  if (!roleConfig) {
    throw new Error(`Role "${role}" belum punya konfigurasi perf.`);
  }

  // Untuk mode per-role/batch, selalu prioritaskan credential spesifik role.
  // PERF_IDENTIFIER/PERF_PASSWORD umum hanya dipakai sebagai fallback terakhir
  // agar tidak menimpa PERF_GURU_IDENTIFIER, PERF_ADMIN_IDENTIFIER, dst.
  const identifier = roleConfig.identifier || context.identifier;
  const password = roleConfig.password || context.password;

  if (!identifier || !password) {
    throw new Error(
      `Credential role "${role}" belum lengkap. Set ${envName(role, "IDENTIFIER")} dan ${envName(role, "PASSWORD")}.`,
    );
  }

  const loginRequest = buildLoginRequest({
    baseUrl: context.baseUrl,
    role,
    identifier,
    password,
  });
  const result = await executeRequest(loginRequest);

  if (result.status >= 400) {
    throw new Error(
      `Login role "${role}" gagal untuk identifier "${maskIdentifier(identifier)}". Status ${result.status}. Body: ${truncate(result.body, 220)}`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    throw new Error(`Response login role "${role}" bukan JSON valid.`);
  }

  const token = parsed?.data?.token;
  if (!token) {
    throw new Error(`Token login untuk role "${role}" tidak ditemukan.`);
  }

  context.roleTokenCache[role] = token;
  return token;
}

async function runAllRoles() {
  console.log(`\n=== SEHATI Backend Performance Test (All Roles) ===`);

  for (const role of Object.keys(ROLE_CONFIGS)) {
    console.log(`\n--- Role: ${role} ---`);
    const context = {
      baseUrl: BASE_URL,
      year: YEAR,
      month: MONTH,
      role,
      identifier: ROLE_CONFIGS[role].identifier,
      password: ROLE_CONFIGS[role].password,
      token: "",
    };

    const stopAt = Date.now() + DURATION_SECONDS * 1000;
    const metrics = {
      startedAt: Date.now(),
      completed: 0,
      failed: 0,
      latencies: [],
      bytes: 0,
      statuses: new Map(),
      errors: [],
      requestCounter: 0,
      fatalError: false,
    };

    const workers = Array.from({ length: CONCURRENCY }, (_, index) =>
      runWorker(index + 1, stopAt, context, buildRoleRequest, metrics),
    );

    await Promise.all(workers);
    const summary = buildSummary(metrics);
    printSummary(summary);

    if (OUTPUT_MODE === "json") {
      process.stdout.write(
        `${JSON.stringify(buildSerializableSummary(summary, context, "role"), null, 2)}\n`,
      );
    }
  }
}

function buildSummary(metrics) {
  const totalRequests = metrics.completed + metrics.failed;
  const elapsedSeconds = Math.max((Date.now() - metrics.startedAt) / 1000, 0.001);
  const sortedLatencies = [...metrics.latencies].sort((a, b) => a - b);
  const throughput = totalRequests / elapsedSeconds;
  const successRate = totalRequests > 0 ? (metrics.completed / totalRequests) * 100 : 0;
  const errorRate = totalRequests > 0 ? (metrics.failed / totalRequests) * 100 : 0;

  return {
    totalRequests,
    completed: metrics.completed,
    failed: metrics.failed,
    throughput,
    bytesKb: metrics.bytes / 1024,
    statusCounts: Object.fromEntries(
      [...metrics.statuses.entries()].sort((a, b) => a[0] - b[0]),
    ),
    latency: {
      min: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
      avg: sortedLatencies.length > 0 ? average(sortedLatencies) : 0,
      p50: sortedLatencies.length > 0 ? percentile(sortedLatencies, 50) : 0,
      p95: sortedLatencies.length > 0 ? percentile(sortedLatencies, 95) : 0,
      p99: sortedLatencies.length > 0 ? percentile(sortedLatencies, 99) : 0,
      max: sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0,
    },
    successRate,
    errorRate,
    errors: metrics.errors,
  };
}

function printSummary(summary) {
  console.log(`\n=== Summary ===`);
  console.log(`Total requests : ${summary.totalRequests}`);
  console.log(`Completed      : ${summary.completed}`);
  console.log(`Failed         : ${summary.failed}`);
  console.log(`Req/sec        : ${summary.throughput.toFixed(2)}`);
  console.log(`Data received  : ${summary.bytesKb.toFixed(2)} KB`);
  console.log(`Status counts  : ${formatStatusesFromObject(summary.statusCounts) || "-"}`);
  console.log(`Success rate   : ${summary.successRate.toFixed(2)}%`);
  console.log(`Error rate     : ${summary.errorRate.toFixed(2)}%`);

  if (summary.completed > 0) {
    console.log(`Latency min    : ${summary.latency.min.toFixed(2)} ms`);
    console.log(`Latency avg    : ${summary.latency.avg.toFixed(2)} ms`);
    console.log(`Latency p50    : ${summary.latency.p50.toFixed(2)} ms`);
    console.log(`Latency p95    : ${summary.latency.p95.toFixed(2)} ms`);
    console.log(`Latency p99    : ${summary.latency.p99.toFixed(2)} ms`);
    console.log(`Latency max    : ${summary.latency.max.toFixed(2)} ms`);
  }

  if (summary.errors.length > 0) {
    console.log(`\nSample errors:`);
    for (const entry of summary.errors) {
      console.log(`- ${entry}`);
    }
  }
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil((p / 100) * sortedValues.length) - 1,
  );
  return sortedValues[Math.max(index, 0)];
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatStatuses(statuses) {
  return [...statuses.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([status, count]) => `${status}=${count}`)
    .join(", ");
}

function formatStatusesFromObject(statusCounts) {
  return Object.entries(statusCounts)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([status, count]) => `${status}=${count}`)
    .join(", ");
}

function truncate(value, maxLength) {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function envName(role, suffix) {
  return `PERF_${role.toUpperCase()}_${suffix}`;
}

function buildSerializableSummary(summary, context, activeProfile) {
  return {
    profile: activeProfile,
    role: context.role ?? null,
    baseUrl: context.baseUrl,
    year: context.year ?? null,
    month: context.month ?? null,
    concurrency: CONCURRENCY,
    durationSeconds: DURATION_SECONDS,
    maxRequests: MAX_REQUESTS,
    timeoutMs: REQUEST_TIMEOUT_MS,
    ...summary,
  };
}

function maskIdentifier(value) {
  const text = String(value ?? "");
  if (text.length <= 4) return text;
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
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

main().catch((error) => {
  console.error(`\nPerformance test gagal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
