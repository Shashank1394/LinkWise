# LinkWise — AI-Powered Internal Linking Agent for Sitecore

LinkWise is an autonomous LLM agent that analyzes Sitecore CMS pages and recommends internal links. The LLM decides which tools to call using OpenAI's function-calling protocol. The system returns the top 8 recommendations sorted by relevance score.

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
│  - Validates results (destination exists, source linkable)  │
│  - Returns top 8 by score                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LinkRecommendationAgent (src/lib/agent.ts)                 │
│  - THE TOOL-CALLING LOOP                                    │
│  - Sends system prompt + full page content to LLM           │
│  - Offers tools to the LLM                                  │
│  - Executes whatever tool the LLM calls                     │
│  - Feeds result back to LLM                                 │
│  - Repeats until LLM calls submit_link_recommendations      │
│  - Sorts results by score, caps at 8                        │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌──────────────────┐  ┌──────────────────────────┐
│find_relevant_    │  │submit_link_              │
│pages             │  │recommendations           │
│                  │  │(TERMINAL — ends loop)     │
└──────┬───────────┘  └──────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Sitecore Services (src/lib/sitecore/)                      │
│  - SitecoreRelevantPageProvider: search + deduplicate       │
│  - SitecoreContentService: content retrieval, link insert   │
│  - AgentApiClient: HTTP calls to Sitecore Agent API         │
└─────────────────────────────────────────────────────────────┘
```

---

## How the LLM Calls Tools

The agent uses **OpenAI's function-calling protocol** with `tool_choice: "required"` — the LLM must always call a tool (never plain text responses).

### 1. Setup

Each tool in the `ToolRegistry` declares:
- `name` — the function name the LLM invokes
- `description` — tells the LLM what the tool does
- `parameters` — JSON Schema for the expected arguments
- `isTerminal` — if true, calling this tool ends the agent loop
- `buildInput(args, context)` — transforms raw LLM arguments + agent context into typed tool input

### 2. The Conversation Loop

```
┌─────────── Agent Loop (max 10 iterations) ──────────┐
│                                                      │
│  1. Send messages[] + tools[] to LLM                 │
│     (tool_choice: "required")                        │
│  2. LLM responds with tool_calls[]                   │
│  3. For each tool call:                              │
│     a. Parse the function name + arguments           │
│     b. Look up the tool in ToolRegistry              │
│     c. Call tool.buildInput(args, context)            │
│     d. Execute the tool                              │
│     e. Append result as a "tool" message             │
│  4. If tool.isTerminal → sort by score, take top 8   │
│  5. Otherwise → go to step 1                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 3. What the LLM Sees

```
[system]   → System prompt with rules and workflow
[user]     → Current page (id, title, path, full content)
[assistant]→ Previous tool calls
[tool]     → Full results from executed tools
...
```

### 4. Tool Decision Logic

The LLM has two tools:

- **find_relevant_pages** — Called first. The LLM generates search queries from the page's topics. Returns full content of all matching navigable pages (filtered to exclude internal `/data/` items).
- **submit_link_recommendations** — Called when done. The LLM submits all link opportunities it found. This ends the loop.

The LLM receives the full content of all discovered pages in one shot. It reads through everything, identifies phrases from the current page that match destination topics, and submits all valid opportunities at once.

---

## File Execution Sequence

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
    → Registers: FindRelevantPagesTool, SubmitLinkRecommendationsTool
  → Builds OpenAI tool definitions from registry
  → Sends first request to LLM via OpenRouter
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
    → Filters out /data/ paths (non-navigable items)
  → Full page content fed back to LLM
```

### Step 5: LLM calls submit_link_recommendations (terminal)
```
src/lib/agent.ts (processes tool call)
  → src/lib/tools/SubmitLinkRecommendationsTool.ts (execute)
    → Validates: minimum 3 words in sourceText, no /data/ paths
    → Returns valid opportunities
  → Agent loop ENDS
  → Sort by score descending, take top 8
```

### Step 6: Service validates results
```
src/lib/service.ts (continues after agent.run returns)
  → Checks destinations exist in retrieved pages
  → For each opportunity: calls isSourceTextLinkable()
    → Verifies the suggested text exists in an editable rich-text field
  → Returns validated opportunities to API route
```

### Step 7: API Route returns response
```
src/app/api/link-opportunities/route.ts
  → Returns JSON: { success: true, opportunities: [...] }
```

---

## Quality Controls

The system enforces quality at multiple layers:

| Layer | What it checks |
|-------|---------------|
| **System prompt** | sourceText must be 3+ words, no single words, no generic anchors, no `/data/` paths |
| **FindRelevantPagesTool** | Filters out all non-navigable pages (`/data/`, `/rich text`) before LLM sees them |
| **SubmitLinkRecommendationsTool** | Validates submissions: rejects <3 word sourceText, rejects `/data/` destinations |
| **Agent** | Sorts by score, caps at top 8 |
| **Service** | Verifies destination exists in retrieved pages, verifies sourceText is in a linkable rich-text field |

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
│   ├── FindRelevantPagesTool.ts      — Search for pages (returns full content)
│   └── SubmitLinkRecommendationsTool.ts — Submit final results (terminal)
│
└── sitecore/             — Sitecore CMS integration
    ├── AgentApiClient.ts             — HTTP client (auth, 30s timeout)
    ├── auth.ts                       — OAuth token management (cached)
    ├── SitecoreContentService.ts     — Search, content, link insertion
    ├── SitecoreRelevantPageProvider.ts — Search orchestration + dedup
    ├── PageMapper.ts                 — Map API results → RelevantPage (strips HTML)
    └── types.ts                      — Sitecore-specific types
```

---

## Logging

Every tool invocation is logged:

```
[LinkWise][Agent] Run started           { runId, pageId, siteName }
[LinkWise][Agent] Tools offered to LLM  { tools: ['find_relevant_pages', 'submit_link_recommendations'] }
[LinkWise][Agent] Iteration             { iteration: 1, messages: 2 }
[LinkWise][Agent] LLM responded         { finishReason: 'tool_calls', toolCalls: 1, usage: {...} }
[LinkWise][Agent] LLM invoked tool      { tool: 'find_relevant_pages', arguments: '{"queries":[...]}' }
[LinkWise][Tool][FindRelevantPages]     { queries: [...], count: 47, navigable: 12 }
[LinkWise][Agent] Tool result           { items: 12 }
[LinkWise][Agent] Iteration             { iteration: 2, messages: 4 }
[LinkWise][Agent] LLM invoked tool      { tool: 'submit_link_recommendations', arguments: '...' }
[LinkWise][Tool][SubmitRecommendations] { received: 5, valid: 4, filtered: 1 }
[LinkWise][Agent] Terminal tool called   { submitted: 4, willKeepTop: 8 }
[LinkWise][Agent] Run completed         { iterations: 2, pages: 12, opportunities: 4 }
[LinkWise][Service] Analysis completed  { recommendations: 3, durationMs: 22000 }
```

---

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | API key for OpenRouter (LLM provider) |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL |
| `OPENROUTER_MODEL` | Model to use (default: `deepseek/deepseek-chat-v3-0324:free`) |
| `SITECORE_AGENT_API` | Base URL of the Sitecore Agent API |
| `SITECORE_CLIENT_ID` | OAuth client ID for Sitecore auth |
| `SITECORE_CLIENT_SECRET` | OAuth client secret |
| `SITECORE_AUTH_URL` | OAuth token endpoint |
| `SITECORE_AUTH_AUDIENCE` | OAuth audience |
| `SITECORE_RICH_TEXT_FIELDS` | Comma-separated field names (default: `Content,Text,Body,MainContent`) |

### Constants

| Constant | Value | Location |
|----------|-------|----------|
| `MAX_ITERATIONS` | 10 | `agent.ts` |
| `MAX_RECOMMENDATIONS` | 8 | `agent.ts` |
| `MAX_RELEVANT_PAGES` | 100 | `SitecoreRelevantPageProvider.ts` |
| `BATCH_SIZE` (content tree) | 10 | `SitecoreContentService.ts` |

---

## Adding a New Tool

1. Create `src/lib/tools/MyNewTool.ts` extending `BaseTool`
2. Define `name`, `description`, `parameters` (JSON Schema)
3. Set `isTerminal = true` if calling this tool should end the agent loop
4. Implement `buildInput(args, context)` to transform LLM arguments + context into typed input
5. Implement `executeInternal(input)`
6. Register it in `src/lib/tools/index.ts`

The LLM will automatically see it on the next request and can decide to use it. No changes to `agent.ts` needed.

---

## API Endpoints

### POST /api/link-opportunities

Analyze a page and return internal link recommendations.

**Request:**
```json
{
  "id": "page-guid",
  "title": "Page Title",
  "path": "/sitecore/content/...",
  "language": "en",
  "siteName": "mysite"
}
```

**Response:**
```json
{
  "success": true,
  "opportunities": [
    {
      "sourceText": "building and pest inspection",
      "anchorText": "building and pest inspection",
      "destination": { "id": "...", "title": "...", "path": "..." },
      "score": 95,
      "reason": "...",
      "seoBenefit": "..."
    }
  ],
  "requestId": "uuid"
}
```

### POST /api/link-opportunities/approve

Insert an approved link into the Sitecore page content.

**Request:**
```json
{
  "currentPage": { "id": "...", "title": "...", "path": "...", "language": "en", "siteName": "..." },
  "opportunity": { "sourceText": "...", "anchorText": "...", "destination": {...}, "score": 95, "reason": "...", "seoBenefit": "..." }
}
```

**Response:**
```json
{ "success": true, "requestId": "uuid" }
```
