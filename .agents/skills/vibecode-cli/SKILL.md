---
name: vibecode-cli
description: Use the official vibecode-cli to manage explicitly requested Vibecode cloud projects, sandboxes, agents and deployments for BHON. Trigger when the user asks to use Vibecode, vibecode.dev, vibecode.run, its cloud sandbox, or a Vibecode deployment.
---

# Vibecode CLI for BHON

Use the official `vibecode/vibecode-cli` only when the user places the task on Vibecode infrastructure. Do not redirect ordinary local or GitHub work to Vibecode merely because the user asks to build or modify the product.

## Local executable

On this Windows workspace the reviewed executable is expected at:

```powershell
.\.tools\vibecode-cli.exe
```

Pinned release: `v0.1.0` Windows AMD64.

Expected SHA-256:

```text
44988BCE211E33B3C4CDFC48BB8626571D74A7760BE9BE2CEE58D61541AA8A85
```

Before first use in a new checkout, download only from the official GitHub release and verify this hash. The binary is not Authenticode-signed, so retain that fact in security reporting.

## Authentication boundary

- The CLI reads `VIBECODE_API_KEY` from the environment.
- Never read, print, copy, display or transmit any `.env` file.
- Never ask the user to paste an API key into chat, source code, commits, logs, shell history or an agent prompt.
- Ask the user to configure the key through the host's secret/environment-variable UI.
- Check only whether `VIBECODE_API_KEY` is present; never print its value.
- Validate access with `vibecode-cli user` only after the user confirms the secret is configured.

## Safe workflow

1. Confirm Vibecode is the requested target.
2. Inspect Git state and identify the exact commit to deploy.
3. Prefer an existing project over creating duplicates:

```powershell
.\.tools\vibecode-cli.exe projects list --output json --query "BHON"
```

4. Create an external project only after authorization:

```powershell
.\.tools\vibecode-cli.exe projects create --quiet webapp "BHON Platform"
```

5. Use `agent send` for requested sandbox iteration. Use `yolo` only when the user explicitly asks Vibecode to build and deploy in one operation.
6. Treat `agent send`, `yolo`, deployments and domain changes as external mutations. State the target and expected effect first.
7. Verify deployment readiness and retrieve the canonical URL:

```powershell
.\.tools\vibecode-cli.exe deployments ready --timeout 10m PROJECT_ID
.\.tools\vibecode-cli.exe deployments get --output json PROJECT_ID
```

8. Report the deployed commit, project ID, readiness result and public URL. Command submission alone is not success.

## Main commands

```text
user
projects list|get|create|rename|commits
sandboxes list|get|acquire|kill|ssh
deployments list|get|deploy|ready|ssh
deployments auth get|set|disable
deployments subdomain check|set
deployments domain get|set|verify|remove
agent send|stop
yolo
version
skill
```

Use `COMMAND --help` for exact flags. Prefer `--output json` for parsing and `--quiet` only to capture an identifier.

## Destructive and sensitive operations

- Never run `projects delete`, `deployments destroy`, `sandboxes kill`, domain removal or auth disabling without explicit confirmation for the exact target.
- Never run any local or remote command that outputs `.env`, credentials, tokens, database URLs or private keys.
- Never pass secrets inside agent prompts or command arguments when an environment secret is supported.
- Do not deploy an uncommitted or unverified worktree by assumption.
- A preview URL is not proof of production readiness; still require tests, health checks, migrations, security gates and rollback planning.
