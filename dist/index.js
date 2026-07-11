"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var core = __toESM(require("@actions/core"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
async function scanText(text, apiKey, baseUrl, context) {
  const start = Date.now();
  const response = await fetch(`${baseUrl}/v1/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({ text, context, direction: "ingress" })
  });
  const latency_ms = Date.now() - start;
  if (!response.ok) {
    throw new Error(`Guard API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return { ...data, latency_ms };
}
function extractTexts(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, "utf-8");
  if (ext === ".json") {
    try {
      let extract2 = function(obj) {
        if (typeof obj === "string") {
          texts.push(obj);
          return;
        }
        if (Array.isArray(obj)) {
          obj.forEach(extract2);
          return;
        }
        if (obj && typeof obj === "object") {
          for (const key of ["text", "content", "prompt", "message", "input", "query"]) {
            if (obj[key])
              extract2(obj[key]);
          }
        }
      };
      var extract = extract2;
      const parsed = JSON.parse(content);
      const texts = [];
      extract2(parsed);
      return texts.filter((t) => t.trim().length > 0);
    } catch {
      return [content];
    }
  }
  if (ext === ".yaml" || ext === ".yml") {
    return content.split("\n").filter((line) => line.includes(":")).map((line) => line.split(":").slice(1).join(":").trim()).filter((t) => t.length > 10);
  }
  return [content.trim()].filter((t) => t.length > 0);
}
function getFiles(scanPath) {
  const stat = fs.statSync(scanPath);
  if (stat.isFile())
    return [scanPath];
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const s = fs.statSync(full);
      if (s.isDirectory()) {
        walk(full);
        continue;
      }
      if ([".txt", ".json", ".yaml", ".yml", ".md"].includes(path.extname(entry).toLowerCase())) {
        files.push(full);
      }
    }
  }
  walk(scanPath);
  return files;
}
async function run() {
  const apiKey = core.getInput("api_key", { required: true });
  const scanPath = core.getInput("scan_path") || "./prompts";
  const failOn = core.getInput("fail_on") || "block";
  const context = core.getInput("context") || "agent_prompt";
  const baseUrl = core.getInput("base_url") || "https://api.diviqra.com";
  core.info(`Diviqra Guard \u2014 LLM Prompt Scanner`);
  core.info(`Scanning: ${scanPath}`);
  core.info(`Fail on: ${failOn}`);
  core.info(`Context: ${context}`);
  core.info(``);
  if (!fs.existsSync(scanPath)) {
    core.warning(`Scan path not found: ${scanPath} \u2014 skipping`);
    core.setOutput("threats_found", "0");
    core.setOutput("blocked_count", "0");
    core.setOutput("warned_count", "0");
    return;
  }
  const files = getFiles(scanPath);
  if (files.length === 0) {
    core.info("No prompt files found \u2014 nothing to scan");
    core.setOutput("threats_found", "0");
    core.setOutput("blocked_count", "0");
    core.setOutput("warned_count", "0");
    return;
  }
  core.info(`Found ${files.length} file(s) to scan`);
  core.info(``);
  const results = [];
  let blockedCount = 0;
  let warnedCount = 0;
  for (const file of files) {
    const texts = extractTexts(file);
    core.info(`Scanning ${path.basename(file)} (${texts.length} prompt(s))`);
    for (const text of texts) {
      try {
        const result = await scanText(text, apiKey, baseUrl, context);
        const preview = text.slice(0, 60).replace(/\n/g, " ");
        const scanResult = {
          file: path.basename(file),
          text: preview,
          blocked: result.blocked,
          warned: result.score > 0.3 && !result.blocked,
          score: result.score,
          threat: result.threat,
          reason: result.reason,
          wall: result.wall,
          latency_ms: result.latency_ms
        };
        results.push(scanResult);
        if (result.blocked) {
          blockedCount++;
          core.error(`BLOCKED [${path.basename(file)}] "${preview}..."`);
          core.error(`  Threat: ${result.threat} | Score: ${result.score} | Wall: ${result.wall} | ${result.latency_ms}ms`);
        } else if (scanResult.warned) {
          warnedCount++;
          core.warning(`WARNED [${path.basename(file)}] "${preview}..."`);
          core.warning(`  Score: ${result.score} | ${result.latency_ms}ms`);
        } else {
          core.info(`  \u2713 SAFE "${preview}..." (${result.latency_ms}ms)`);
        }
      } catch (err) {
        core.warning(`  Scan failed for prompt in ${file}: ${err}`);
      }
    }
  }
  const threatsFound = blockedCount + warnedCount;
  core.info(``);
  core.info(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
  core.info(`Guard Scan Summary`);
  core.info(`  Files scanned:  ${files.length}`);
  core.info(`  Prompts scanned: ${results.length}`);
  core.info(`  Blocked:        ${blockedCount}`);
  core.info(`  Warned:         ${warnedCount}`);
  core.info(`  Clean:          ${results.length - threatsFound}`);
  core.info(`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`);
  core.setOutput("threats_found", String(threatsFound));
  core.setOutput("blocked_count", String(blockedCount));
  core.setOutput("warned_count", String(warnedCount));
  core.setOutput("scan_id", `guard-${Date.now()}`);
  if (failOn === "block" && blockedCount > 0) {
    core.setFailed(`Guard blocked ${blockedCount} prompt(s). Fix injection vulnerabilities before deploying.`);
  } else if (failOn === "warn" && threatsFound > 0) {
    core.setFailed(`Guard found ${threatsFound} threat(s). Review before deploying.`);
  }
}
run().catch((err) => {
  core.setFailed(`Guard action failed: ${err.message}`);
});
