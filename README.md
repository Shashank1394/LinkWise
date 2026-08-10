# LinkWise — AI-Powered Internal Linking Agent for Sitecore

LinkWise is an autonomous LLM agent that analyzes Sitecore CMS pages and recommends internal links. The LLM decides which tools to call and in what order using OpenAI's function-calling protocol.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Route: POST /api/link-opportunities            │
│  src/app/api/link-opportunities/route.ts                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LinkAnalysisService (src/lib/service.ts)                   │
│  - Fetches current page content from Sitecore               │
│  - Starts the agent                                         │
│  - Validates agent results                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LinkRecommendationAgent (src/lib/agent.ts)                 │
│  - THE TOOL-CALLING LOOP                                    │
│  - Sends system prompt + page content to LLM                │
│  - Offers all tools to the LLM                              │
│  - Executes whatever tool the LLM calls                     │
│  - Feeds result back to LLM                                 │
│  - Repeats until LLM calls submit_link_recommendations      │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│find_relevant │ │get_page_     │ │submit_link_          │
│_pages        │ │content       │ │recommendations       │
│              │ │              │ │(TERMINAL — ends loop) │
└──────┬───────┘ └──────┬───────┘ └──────────────────────┘
       │                │
       ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│  Sitecore Services (src/lib/sitecore/)                      │
│  - SitecoreRelevantPageProvider: search + deduplicate       │
│  - SitecoreContentService: content retrieval, link insert   │
│  - AgentApiClient: HTTP calls to Sitecore Agent API         │
└─────────────────────────────────────────────────────────────┘
```

---

## How the LLM Calls Tools

The agent uses **OpenAI's function-calling protocol** (tool_choice: auto). Here's exactly how it works:

### 1. Setup

The agent builds an array of tool definitions from the `ToolRegistry`. Each tool declares:
- `name` — the function name the LLM will invoke
- `description` — tells the LLM what the tool does
- `parameters` — JSON Schema describing the expected arguments

These get converted to OpenAI `ChatCompletionTool` format via `toOpenAiTool()`.

### 2. The Conversation Loop

```
┌─────────── Agent Loop (max 6 iterations) ───────────┐
│                                                      │
│  1. Send messages[] + tools[] to LLM                 │
│  2. LLM responds with tool_calls[]                   │
│  3. For each tool call:                              │
│     a. Parse the function name + arguments           │
│     b. Look up the tool in ToolRegistry              │
│     c. Execute the tool                              │
│     d. Append result as a "tool" message             │
│  4. If LLM called submit_link_recommendations → DONE │
│  5. Otherwise → go to step 1                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3. What the LLM Sees

On each turn, the LLM receives the full conversation history:

```
[system]   → System prompt with workflow instructions
[user]     → Current page (id, title, path, content)
[assistant]→ Previous tool calls
[tool]     → Results from executed tools
...
```

The LLM then decides its next action by returning one or more `tool_calls`.

### 4. Tool Decision Logic

The LLM decides which tool to call based on:
- **find_relevant_pages** — Called first. The LLM reads the page content, identifies key topics, and generates search queries.
- **get_page_content** — Called optionally. If the LLM wants to read full content of specific pages before recommending links.
- **submit_link_recommendations** — Called last. Once the LLM has enough information, it submits its final recommendations. This ends the loop.

The LLM is NOT hardcoded to follow a specific order. It's free to:
- Call `find_relevant_pages` multiple times with different queries
- Call `get_page_content` for pages it wants to inspect deeper
- Submit immediately if it has enough info from the initial search results

---

## File Execution Sequence

Here's the exact order files execute during a typical request:

### Step 1: API Route receives request
```
src/app/api/link-opportunities/route.ts
  → Validates request body (zod schema)
  → Calls createLinkAnalysisService()
```

### Step 2: Service fetches page content
```
src/lib/service.ts (LinkAnalysisService.analyze)
  → src/lib/sitecore/SitecoreContentService.ts (getPagePlainText)
    → src/lib/sitecore/AgentApiClient.ts (getContentItem, getPageComponents)
      → HTTP calls to Sitecore Agent API
```

### Step 3: Agent loop starts
```
src/lib/agent.ts (LinkRecommendationAgent.run)
  → src/lib/tools/index.ts (createToolRegistry)
    → Registers: FindRelevantPagesTool, GetPageContentTool, SubmitLinkRecommendationsTool
  → Builds OpenAI tool definitions from registry
  → Sends first request to OpenRouter LLM
```

### Step 4: LLM calls find_relevant_pages
```
src/lib/agent.ts (processes tool call)
  → src/lib/tools/FindRelevantPagesTool.ts (execute)
    → src/lib/sitecore/SitecoreRelevantPageProvider.ts (getRelevantPages)
      → src/lib/sitecore/SitecoreContentService.ts (searchRelevantPages)
        → src/lib/sitecore/AgentApiClient.ts (searchPages)
          → HTTP: GET /api/v1/pages/search
      → src/lib/sitecore/PageMapper.ts (mapToRelevantPage)
  → Result fed back to LLM as tool message
```

### Step 5: LLM optionally calls get_page_content
```
src/lib/agent.ts (processes tool call)
  → src/lib/tools/GetPageContentTool.ts (execute)
    → src/lib/sitecore/SitecoreContentService.ts (getPageContent)
      → src/lib/sitecore/AgentApiClient.ts (getContentItem)
        → HTTP: GET /api/v1/content/{pageId}
  → Result fed back to LLM as tool message
```

### Step 6: LLM calls submit_link_recommendations (terminal)
```
src/lib/agent.ts (processes tool call)
  → src/lib/tools/SubmitLinkRecommendationsTool.ts (execute)
    → Returns opportunities as-is (validation only)
  → Agent loop ENDS
```

### Step 7: Service validates results
```
src/lib/service.ts (continues after agent.run returns)
  → Checks destinations exist in retrieved pages
  → For each opportunity: calls isSourceTextLinkable()
    → src/lib/sitecore/SitecoreContentService.ts (findSourceContentItem)
      → Verifies the suggested text exists in an editable rich-text field
  → Returns validated opportunities to API route
```

### Step 8: API Route returns response
```
src/app/api/link-opportunities/route.ts
  → Returns JSON: { success: true, opportunities: [...] }
```

---

## Project Structure

```
src/lib/
├── types.ts              — All shared TypeScript interfaces
├── schemas.ts            — Zod validation schemas
├── agent.ts              — LLM tool-calling loop (the brain)
├── service.ts            — LinkAnalysisService + factory (entry point)
│
├── tools/                — Tools the LLM can invoke
│   ├── index.ts          — Registry creation + exports
│   ├── Tool.ts           — Tool interface + toOpenAiTool()
│   ├── BaseTool.ts       — Abstract base class with logging
│   ├── ToolRegistry.ts   — Name → Tool map
│   ├── FindRelevantPagesTool.ts      — Search for pages
│   ├── GetPageContentTool.ts         — Read page content
│   └── SubmitLinkRecommendationsTool.ts — Submit final results
│
└── sitecore/             — Sitecore CMS integration
    ├── AgentApiClient.ts             — HTTP client (auth, timeout)
    ├── auth.ts                       — OAuth token management
    ├── SitecoreContentService.ts     — Search, content, link insertion
    ├── SitecoreRelevantPageProvider.ts — Search orchestration + dedup
    ├── PageMapper.ts                 — Map API results to RelevantPage
    └── types.ts                      — Sitecore-specific types
```

---

## Logging

Every tool invocation is logged with:
- `[LinkWise][Agent] LLM invoked tool` — which tool, with what arguments
- `[LinkWise][Agent] Tool result` — summary of what came back
- `[LinkWise][Tool][*]` — internal tool execution details (timing, counts)

Example log output for a typical run:
```
[LinkWise][Agent] Run started           { runId, pageId, siteName }
[LinkWise][Agent] Tools offered to LLM  { tools: ['find_relevant_pages', 'get_page_content', 'submit_link_recommendations'] }
[LinkWise][Agent] Iteration             { iteration: 1 }
[LinkWise][Agent] LLM responded         { finishReason: 'tool_calls', toolCalls: 1 }
[LinkWise][Agent] LLM invoked tool      { tool: 'find_relevant_pages', arguments: '{"queries":["..."]}' }
[LinkWise][Tool][FindRelevantPages]     { queries: [...], count: 43 }
[LinkWise][Agent] Tool result           { pagesFound: 43 }
[LinkWise][Agent] Iteration             { iteration: 2 }
[LinkWise][Agent] LLM responded         { finishReason: 'tool_calls', toolCalls: 1 }
[LinkWise][Agent] LLM invoked tool      { tool: 'submit_link_recommendations', arguments: '{"opportunities":[...]}' }
[LinkWise][Tool][SubmitRecommendations] { count: 4 }
[LinkWise][Agent] Run completed         { iterations: 2, pages: 43, opportunities: 4 }
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | API key for OpenRouter (LLM provider) |
| `OPENROUTER_MODEL` | Model to use (default: `deepseek/deepseek-chat-v3-0324:free`) |
| `SITECORE_AGENT_API` | Base URL of the Sitecore Agent API |
| `SITECORE_CLIENT_ID` | OAuth client ID for Sitecore auth |
| `SITECORE_CLIENT_SECRET` | OAuth client secret |
| `SITECORE_RICH_TEXT_FIELDS` | Comma-separated field names (default: `Content,Text,Body,MainContent`) |

---

## Adding a New Tool

1. Create `src/lib/tools/MyNewTool.ts` extending `BaseTool`
2. Define `name`, `description`, `parameters` (JSON Schema)
3. Implement `executeInternal()`
4. Register it in `src/lib/tools/index.ts`

The LLM will automatically see it on the next request and can decide to use it.
