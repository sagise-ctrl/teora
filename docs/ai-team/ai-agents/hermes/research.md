# Hermes AI Agent — Research File

> Created: 2026-09-23
> Purpose: Teora will adopt Hermes as its AI agent framework
> Source: [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)

---

## Overview

**Hermes** is a self-improving AI agent built by [Nous Research](https://nousresearch.com). It is an open-source autonomous agent framework with 248k+ GitHub stars, MIT licensed. The only agent with a built-in learning loop — it creates skills from experience, improves them during use, and persists knowledge across sessions.

### Quick Facts

| Property | Value |
|-----------|-------|
| Creator | Nous Research |
| GitHub | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) |
| Stars | 248k+ |
| License | MIT |
| Language | Python 3.11+ |
| Docs | [hermes-agent.nousresearch.com/docs](https://hermes-agent.nousresearch.com/docs/) |
| Discord | [discord.gg/NousResearch](https://discord.gg/NousResearch) |
| Skills Hub | [agentskills.io](https://agentskills.io) |

---

## Why Hermes for Teora

Based on owner statement: "kita akan jadikan dia sebagai agen Teora" — Teora needs a persistent, autonomous AI agent that:
- **Lives on cloud infrastructure** (Vercel/Remotebase/VPS)
- **Communicates** through the Teora platform
- **Remembers** user history and preferences
- **Improves itself** from experience (skill creation)
- **Works autonomously** without human intervention
- **Can be extended** via plugins and MCP

Hermes's architecture maps directly to Teora's needs:
- Persistent memory → remembers user's projects, preferences, learning history
- Skill system → Teora-specific skills (grading rubrics, citation formatting, lesson planning)
- Bot Mode → multiple specialist agents (task mentor, reference assistant, assessment grader)
- Gateway → unified messaging layer for all Teora communication
- Automation → scheduled tasks, reminders, proactive suggestions

---

## Architecture

### Directory Structure
```
hermes-agent/
├── agent/          # Core agent loop
├── gateway/        # Messaging gateway (CLI, Telegram, Discord, etc.)
├── plugins/        # Plugin system
├── tools/          # Built-in tools (60+)
├── skills/         # Skill definitions (procedural memory)
├── providers/      # LLM provider integrations
├── memory/         # Memory system (FTS5, Honcho)
└── cli/           # CLI interface
```

### Terminal Backends (7 supported)
1. **Local** — direct execution
2. **Docker** — containerized
3. **SSH** — remote server
4. **Singularity** — HPC environments
5. **Modal** — serverless (near-zero idle cost)
6. **Daytona** — serverless dev environments
7. **Vercel Sandbox** — Vercel serverless

### LLM Providers
- Nous Portal (Nous Research's model hub)
- OpenRouter
- OpenAI (GPT-4, o1, etc.)
- Anthropic (Claude 3.5, etc.)
- OpenAI-compatible endpoints
- Custom endpoints

### Tools (60+ built-in)
- Web search (Firecrawl)
- Web browsing and scraping
- Vision/image analysis
- Image generation (FAL)
- Text-to-Speech (OpenAI)
- Cloud browser (Browser Use)
- Code execution
- File operations
- And more

### Memory System
- **FTS5** — full-text search across sessions
- **LLM summarization** — auto-summarizes memories
- **Honcho** — dialectic user modeling (builds user profile over time)
- **Skills** — procedural memory the agent creates and reuses

---

## Core Features

### 1. Closed Learning Loop
The agent **improves itself** during use:
- Creates new skills from experience
- Updates existing skills
- Builds deepening user model (via Honcho)
- Cross-session recall via FTS5

### 2. Skills System
- Procedural memory that persists across sessions
- Open standard compatible with [agentskills.io](https://agentskills.io)
- Community-contributed skill library
- Auto-generated from agent experience
- Portable and shareable

### 3. Bot Mode
Named bots with:
- Own model (any LLM)
- Own memory
- Own skills
- Own routines
- Own chat threads

Build a **team of specialist bots** that collaborate in group chats or through @mentions.

### 4. Messaging Gateway
Unified gateway supporting 20+ platforms:
- CLI, Telegram, Discord, Slack, WhatsApp, Signal
- Email, SMS, Matrix, Mattermost
- DingTalk, Feishu, WeCom, Weixin, QQ Bot
- Yuanbao, BlueBubbles, Home Assistant
- Microsoft Teams, Google Chat

### 5. Automation
- Built-in cron scheduler with natural language config
- Delivery to any messaging platform
- Parallelization via isolated subagents
- Programmatic tool calling (`execute_code`)

### 6. Voice Mode
Real-time voice interaction in:
- CLI
- Telegram
- Discord
- Discord VC

### 7. MCP Integration
- Connect to any MCP server
- Filter their tools
- Safe extension pattern

---

## Installation

### Linux/macOS/WSL2/Termux
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

### Windows (PowerShell)
```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

### Manual
```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
pip install -e .
```

---

## Usage

| Command | Description |
|---------|-------------|
| `hermes` | Start interactive CLI |
| `hermes model` | Choose LLM provider and model |
| `hermes tools` | Configure enabled tools |
| `hermes gateway` | Start messaging gateway |
| `hermes setup` | Run full setup wizard |
| `hermes doctor` | Diagnose issues |

---

## Tech Stack

- **Python 3.11+**
- **Node.js** (for some tools)
- **uv** (Rust package manager — fast)
- **ripgrep** (search)
- **ffmpeg** (media)
- **Docker** (optional)
- Works with any LLM provider

---

## Comparison to Other Agents

From Hermes docs:

> "Not a coding copilot tethered to an IDE or a chatbot wrapper around a single API."

Hermes is:
- **Autonomous** — gets more capable over time
- **Persistent** — remembers everything across sessions
- **Multi-platform** — communicates via 20+ channels
- **Extensible** — skills, plugins, MCP
- **Self-improving** — creates and refines its own skills

vs. Claude Code, Cursor, Copilot — these are IDE-tethered coding assistants.
Hermes is a **full autonomous agent** that can run on a $5 VPS.

---

## Integration with Teora

### Option A: Embedded Agent
Embed Hermes as a Python service alongside Teora's Express backend:
- Teora backend → calls Hermes via HTTP/RPC
- Hermes manages user memory, skills, automation
- Teora frontend → communicates with Hermes gateway

### Option B: Standalone Service
Deploy Hermes separately as an autonomous agent:
- Runs on Modal/Daytona/Vercel Sandbox (near-zero idle cost)
- Connects to Teora via API
- Acts as the "brain" behind Teora's AI features

### Option C: Skill Library
Use Hermes's skills system to create Teora-specific skills:
- `grading-rubric.skill` — rubric-based assessment
- `citation-helper.skill` — citation formatting and validation
- `lesson-planner.skill` — structured lesson planning
- `academic-writing.skill` — academic writing assistance

---

## Next Steps for Teora Integration

1. **Install Hermes locally** and test the CLI
2. **Define Teora-specific skills** using the skills system
3. **Choose deployment platform** (Modal recommended for cost efficiency)
4. **Integrate via API** — Teora backend calls Hermes agent
5. **Enable Bot Mode** — create specialist agents for different features
6. **Connect messaging** — eventually could notify users via Telegram/WhatsApp

---

## Resources

- Main repo: https://github.com/NousResearch/hermes-agent
- Docs: https://hermes-agent.nousresearch.com/docs/
- Discord: https://discord.gg/NousResearch
- Skills Hub: https://agentskills.io
- Nous Research: https://nousresearch.com
