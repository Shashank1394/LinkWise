# LinkWise — AI-Powered Internal Linking Agent for Sitecore

LinkWise is an autonomous LLM agent that analyzes Sitecore CMS pages and recommends internal links. The LLM decides which tools to call using OpenAI's function-calling protocol. The system returns up to 15 recommendations sorted by relevance score.

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
│  - Returns top 15 by score                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  LinkRecommendationAgent (src/lib/agent.ts)                 │
│  - THE TOOL-CALLING LOOP                                    │
│  - Sends system prompt + full page content to LLM           │
│  - Offers tools to the LLM (tool_choice: "required")        │
│  - Executes whatever tool the LLM calls                     │
│  - Feeds result back to LLM                                 │
│  - Repeats until LLM calls submit_link_recommendations      │
│  - Sorts results by score, caps at 15                       │
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
│  - SitecoreRelevantPageProvider: search + content tree      │
│  - SitecoreContentService: content retrieval, link insert   │
│  - AgentApiClient: HTTP calls to Sitecore Agent API         │
└─────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Page Discovery

The agent discovers pages through two sources that are always combined:

1. **Search API** — queries the Sitecore search endpoint with topic-based queries derived from the current page content
2. **Content Tree** — fetches ALL pages from the site tree (up to 100, in batches of 10) to ensure every navigable page is available

Both sources are merged and deduplicated. Only pages whose path contains `/Home/` are passed to the LLM — this ensures only actual navigable pages (not datasources, footers, or field-level items) are considered as link destinations.

### Caching

Search results and page content are cached in memory with a 5-minute TTL. Repeat analyses of the same page or overlapping queries are served from cache without hitting the Sitecore API.

### The Tool-Calling Loop

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
│     e. Track discovered page IDs in context          │
│     f. Append result as a "tool" message             │
│  4. If tool.isTerminal → validate, sort, take top 15 │
│  5. Otherwise → go to step 1                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### LLM Behavior

- `tool_choice: "required"` — the LLM must always call a tool, never respond with plain text
- If the LLM somehow responds without a tool call, the agent nudges it with a message to call `submit_link_recommendations`
- The LLM is encouraged to call `find_relevant_pages` multiple times with different queries if fewer than 6 opportunities are found

---

## Quality Controls

| Layer | What it checks |
|-------|---------------|
| **System prompt** | sourceText must be 2+ words, no single words, no generic anchors, destination must be under `/Home/` |
| **FindRelevantPagesTool** | Filters results to only pages with `/Home/` in their path |
| **SubmitLinkRecommendationsTool** | Validates: sourceText ≥ 2 words, destination ID must exist in discovered pages set, destination path must contain `/Home/` |
| **Agent** | Sorts by score descending, caps at top 15 |
| **Service** | Verifies destination exists in retrieved pages, verifies sourceText is in a linkable rich-text field |

### Destination Validation (Dynamic)

The agent tracks every page ID returned by `find_relevant_pages` in a `discoveredPageIds` set. When the LLM submits recommendations, each destination ID is validated against this set. If the LLM invents an ID or references a page not returned by the tools, it gets rejected. No hardcoded path patterns needed.

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
```

### Step 3: Agent loop starts
```
src/lib/agent.ts (LinkRecommendationAgent.run)
  → src/lib/tools/index.ts (createToolRegistry)
    → Registers: FindRelevantPagesTool, SubmitLinkRecommendationsTool
  → Sends first request to LLM via OpenRouter
```

### Step 4: LLM calls find_relevant_pages
```
src/lib/agent.ts
  → src/lib/tools/FindRelevantPagesTool.ts (execute)
    → src/lib/sitecore/SitecoreRelevantPageProvider.ts (getRelevantPages)
      → Search API (parallel queries)
      → Content Tree (batches of 10, always included)
      → Merge + deduplicate
    → Filter to /Home/ pages only
  → Full page content fed back to LLM
```

### Step 5: LLM calls submit_link_recommendations (terminal)
```
src/lib/agent.ts
  → src/lib/tools/SubmitLinkRecommendationsTool.ts (execute)
    → Validates against discoveredPageIds set
    → Validates sourceText ≥ 2 words
    → Validates destination path contains /Home/
  → Agent sorts by score, takes top 15
  → Loop ends
```

### Step 6: Service validates results
```
src/lib/service.ts
  → Checks destinations exist in retrieved pages
  → For each opportunity: calls isSourceTextLinkable()
    → Verifies text exists in an editable rich-text field
  → Returns validated opportunities
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
│   ├── FindRelevantPagesTool.ts      — Search + content tree (returns full content)
│   └── SubmitLinkRecommendationsTool.ts — Submit + validate (terminal)
│
└── sitecore/             — Sitecore CMS integration
    ├── AgentApiClient.ts             — HTTP client (auth, 30s timeout)
    ├── auth.ts                       — OAuth token management (cached 24h)
    ├── SitecoreContentService.ts     — Search, content (cached 5min), link insertion
    ├── SitecoreRelevantPageProvider.ts — Search + tree enrichment + dedup
    ├── PageMapper.ts                 — Map API results → RelevantPage (strips HTML)
    └── types.ts                      — Sitecore-specific types
```

---

## Logging

```
[LinkWise][Agent] Run started           { runId, pageId, siteName }
[LinkWise][Agent] Tools offered to LLM  { tools: ['find_relevant_pages', 'submit_link_recommendations'] }
[LinkWise][Agent] Iteration             { iteration: 1, messages: 2 }
[LinkWise][Agent] LLM responded         { finishReason, toolCalls, usage }
[LinkWise][Agent] LLM invoked tool      { tool, arguments }
[LinkWise][Tool][FindRelevantPages]     { queries, count, filtered }
[LinkWise][RelevantPageProvider]        { search results, tree enrichment, total }
[LinkWise][Agent] Tool result           { items }
[LinkWise][Agent] LLM invoked tool      { tool: 'submit_link_recommendations' }
[LinkWise][Tool][SubmitRecommendations] { received, valid, filtered }
[LinkWise][Agent] Terminal tool called   { submitted, willKeepTop: 15 }
[LinkWise][Agent] Run completed         { iterations, pages, opportunities, durationMs }
[LinkWise][Service] Analysis completed  { recommendations, durationMs }
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
| `MAX_RECOMMENDATIONS` | 15 | `agent.ts` |
| `MAX_RELEVANT_PAGES` | 100 | `SitecoreRelevantPageProvider.ts` |
| `BATCH_SIZE` (content tree) | 10 | `SitecoreContentService.ts` |
| `CACHE_TTL_MS` | 5 minutes | `SitecoreContentService.ts` |

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
