# Diviqra Guard — GitHub Action

Scan LLM prompts for injection attacks before deployment.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Usage

```yaml
- name: Guard Prompt Scan
  uses: diviqra-builds/guard-action@v1
  with:
    api_key: ${{ secrets.GUARD_API_KEY }}
    scan_path: ./prompts/
    fail_on: block
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | Yes | — | Diviqra Guard API key (`dg_dev_...`) |
| `scan_path` | No | `./prompts` | Path to prompt files (.txt, .json, .yaml) |
| `fail_on` | No | `block` | Fail pipeline on: `block`, `warn`, or `never` |
| `context` | No | `agent_prompt` | Scan context: `agent_prompt`, `user_input`, `system_prompt` |

## Outputs

| Output | Description |
|--------|-------------|
| `threats_found` | Total threats detected |
| `blocked_count` | Prompts blocked |
| `warned_count` | Prompts that triggered warnings |

## Full example

```yaml
name: Deploy AI Agent

on: [push]

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
          echo "Threats found: ${{ steps.guard.outputs.threats_found }}"
          echo "Blocked: ${{ steps.guard.outputs.blocked_count }}"

  deploy:
    needs: guard-scan
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "Deploying safely..."
```

## Get API key

Free tier: 10,000 scans/month — [guard.diviqra.com](https://guard.diviqra.com/register)

## License

MIT — [Diviqra Technologies](https://diviqra.com)
