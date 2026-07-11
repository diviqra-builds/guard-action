# Diviqra Guard — LLM Prompt Scanner

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Diviqra%20Guard-blue?logo=github)](https://github.com/marketplace/actions/diviqra-guard-llm-prompt-scanner)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Scan LLM prompt files for injection attacks, jailbreaks, and PII extraction before they reach production.

## Why

Prompt injection is the #1 LLM security risk (OWASP LLM01). A single malicious prompt in your deployment can leak your system prompt, exfiltrate user PII, or hijack your agent's behaviour. Guard catches these in CI — before they ship.

## Quick Start

```yaml
- name: Guard Prompt Scan
  uses: diviqra-builds/guard-action@v1
  with:
    api_key: ${{ secrets.GUARD_API_KEY }}
    scan_path: ./prompts/
    fail_on: block
```

Get a free API key at [guard.diviqra.com](https://guard.diviqra.com).

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | ✅ | — | Diviqra Guard API key (`dg_dev_*`, `dg_pro_*`, `dg_ent_*`) |
| `scan_path` | | `./prompts` | Directory or file containing prompts to scan |
| `fail_on` | | `block` | Fail pipeline on: `block`, `warn`, or `never` |
| `context` | | `agent_prompt` | Scan context: `agent_prompt`, `user_input`, `system_prompt` |
| `base_url` | | `https://api.diviqra.com` | API base URL (override for self-hosted deployments) |

## Outputs

| Output | Description |
|--------|-------------|
| `threats_found` | Total threats detected (blocked + warned) |
| `blocked_count` | Number of prompts blocked |
| `warned_count` | Number of prompts that triggered warnings |
| `scan_id` | Unique scan run ID for reference |

## Full Example

```yaml
name: Deploy AI Agent

on:
  push:
    branches: [main]
  pull_request:
    paths:
      - 'prompts/**'
      - 'src/**/*.txt'

jobs:
  guard-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan prompts with Diviqra Guard
        id: guard
        uses: diviqra-builds/guard-action@v1
        with:
          api_key: ${{ secrets.GUARD_API_KEY }}
          scan_path: ./src/prompts/
          fail_on: block
          context: agent_prompt

      - name: Show results
        if: always()
        run: |
          echo "Files scanned : ${{ steps.guard.outputs.files_scanned }}"
          echo "Threats found : ${{ steps.guard.outputs.threats_found }}"
          echo "Blocked       : ${{ steps.guard.outputs.blocked_count }}"
          echo "Warned        : ${{ steps.guard.outputs.warned_count }}"

  deploy:
    needs: guard-scan
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "Deploying safely..."
```

## Supported File Types

| Extension | How prompts are extracted |
|-----------|---------------------------|
| `.txt`, `.md` | Entire file as one prompt |
| `.json` | String values at keys: `text`, `content`, `prompt`, `message`, `input`, `query` |
| `.yaml` / `.yml` | String values from key-value pairs |

## Fail Modes

| `fail_on` | Pipeline fails when |
|-----------|---------------------|
| `block` (default) | Any prompt receives action: block |
| `warn` | Any prompt receives action: block or warn |
| `never` | Never — use outputs for custom logic |

## What Guard Detects

- **Prompt injection** — direct and indirect (OWASP LLM01)
- **System prompt extraction** — "repeat your instructions" patterns (OWASP LLM07)
- **PII exfiltration** — Aadhaar, PAN, GST, phone, email patterns (OWASP LLM02)
- **Jailbreaks** — DAN, persona hijack, roleplay bypass
- **Multilingual attacks** — Hindi, Tamil, Telugu, Kannada transliteration

## Pricing

| Plan | Scans/month | Price |
|------|-------------|-------|
| Free | 10,000 | Free forever |
| Pro | 500,000 | Contact sales |
| Enterprise | 5,000,000 | Contact sales |

Get your free API key → [guard.diviqra.com](https://guard.diviqra.com)

## GitLab CI

See [guard.diviqra.com/docs/cicd](https://guard.diviqra.com/docs/cicd) for the GitLab CI component.

## Links

- [Guard Console](https://guard.diviqra.com)
- [CI/CD Docs](https://guard.diviqra.com/docs/cicd)
- [Diviqra](https://diviqra.com)

## License

MIT — [Diviqra Technologies](https://diviqra.com)
