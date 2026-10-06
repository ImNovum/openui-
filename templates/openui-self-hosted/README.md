This is an [OpenUI](https://openui.com) Self Hosted Chat project bootstrapped with [`openui-cli`](https://openui.com/docs/chat/quick-start).

## Setup

The chat endpoint (`src/app/api/chat/route.ts`) calls DeepSeek's OpenAI-compatible
Chat Completions API directly (no n8n proxy) and streams the response back to the
OpenUI chat UI.

Create `.env.local` with your DeepSeek credentials:

```bash
DEEPSEEK_API_KEY=...
# Optional:
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/api/chat/route.ts` and improving your agent
by adding system prompts or tools. A LangGraph scaffold puts the
implementation in `src/agent/agent.ts` instead.

The generated app includes a `get_weather` tool example. Ask “What’s the weather in Berlin?” to exercise its native tool loop.

## Deploy

From the project directory, deploy a preview with the pinned OpenUI CLI:

```bash
pnpm run deploy
pnpm run deploy -- --prod
```

The command deploys to Vercel. Allowlisted keys from `.env` / `.env.local` (including `DEEPSEEK_API_KEY`)
are passed to that deployment unless you use `--skip-env`. Persist them on the Vercel project for later
deploys.

## Framework deployments

The scaffold runs its backend inside the Next.js API route, so the frontend and backend
are deployed together as one Next.js project (root directory: `templates/openui-self-hosted`).

## Conversation storage

This starter does not configure durable conversation storage. `AgentInterface`
keeps messages in memory for the current page session and sends that history to
`/api/chat`; refreshing the page loses it. To persist conversations, pass a storage
implementation to `AgentInterface` and back it with your own database. Add a
LangGraph checkpointer separately only for graph-specific durable state.

## Learn More

To learn more about OpenUI, take a look at the following resources:

- [OpenUI Documentation](https://openui.com/docs) - learn about OpenUI features and API.
- [OpenUI GitHub repository](https://github.com/thesysdev/openui) - your feedback and contributions are welcome!
