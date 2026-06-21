# handin — Product Specification & Development Plan

---

## 1. Product Overview

**handin** is a Mac desktop note-taking app for working students and developers. It stores notes as markdown files locally, syncs to a private GitHub repo silently, and turns task completions into git commits. It is visual, fast, and opinionated — with progressive feature disclosure so it never feels overwhelming.

**Core philosophy:**
- Notes are markdown files. Always yours, never locked in.
- Git is invisible infrastructure, not a workflow.
- The app gets deeper the more you use it — features reveal themselves over time.
- Pay what you use for AI (user's own API key). No subscription.

---

## 2. Target User

**Primary:** Working student — juggling coursework, projects, maybe a part-time job. Has no coherent system today. Uses Notion (too bloated), Apple Notes (too dumb), or scattered markdown files (no system).

**Secondary:** Working developer who wants a personal knowledge base outside their company's tools.

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Desktop framework | Electron | Filesystem access, git operations, cross-platform later |
| UI | React + TypeScript | Smooth animations, large community, scales well |
| Styling | Tailwind CSS | Fast to build, consistent design tokens |
| Animations | Framer Motion | Spring physics, 60fps, Apple-quality transitions |
| Local database | SQLite (better-sqlite3) | Images, metadata, keyword index |
| Git operations | simple-git (npm) | Invisible git automation |
| Search | Fuse.js | Fuzzy search, fast, no server |
| AI | OpenAI / Anthropic API | User provides their own key |
| Date parsing | chrono-node | Natural language date parsing for reminders |
| Auth | GitHub OAuth | Single sign-in, repo creation |

---

## 4. Design Language

### Typography
- **One font throughout:** Monospaced, readable — similar to iA Writer's typeface
- **Heading:** Triggered by `- ` + space at line start → renders bold, slightly larger
- **Body:** Single font size for everything else
- No font picker, no size controls

### Color
- Follows macOS system dark/light mode automatically
- No manual toggle at launch
- **Scratch notes:** Rendered in grey — visually signals temporary/incognito
- **Writer quotes on home:** Faint grey, curated hardcoded collection (50-100 quotes)

### Motion
- Spring physics, not linear easing — the way Apple's own apps feel
- 60fps minimum on all transitions
- Sub-note zoom: expands outward from the exact word clicked, like it was hiding inside it
- Sidebar: smooth slide in/out, never jarring

### Principles
- No save button. No commit button. No terminal visible.
- Every interaction has one happy path that requires zero extra keypresses.
- Popups and modals are used sparingly — prefer inline interactions.

---

## 5. App Structure

### Home Screen

```
┌─────────────────────────────────────────────────────┐
│  [Search bar — full width, top]                     │
├───────────────────┬─────────────────────────────────┤
│ > Sidebar         │                                 │
│   (collapsible,   │   Month Calendar                │
│   default open)   │   (current month, today greyed) │
│                   │                                 │
│   Notes list      │   Tasks due today listed        │
│   (with icons)    │   below calendar grid           │
│                   │                                 │
│   Task Lists      │                                 │
│   (below notes)   │                                 │
│                   │                                 │
│                   │   [Writer quote — grey, faint]  │
├───────────────────┴─────────────────────────────────┤
│ [Account button — bottom left]                      │
└─────────────────────────────────────────────────────┘
```

### Sidebar
- Collapsible via arrow button (default open)
- **Section 1: Notes** — flat list of note titles, checkbox icon if note has tasks
- **Section 2: Task Lists** — named lists (`self-study-cs`, etc.)
- **Icon: Dumps** — badge shows count of unreviewed screenshots
- **Icon: Graph Map**
- **Icon: Tasks overlay trigger**
- No hierarchy in sidebar — hierarchy lives in the graph map

### Note Screen

```
┌──────────────────────────────────────────────┐
│ ← breadcrumb (if sub-note)     [clock] [✦]  │
│                                              │
│ Note title (heading)                         │
│                                              │
│ Body text...                                 │
│                                              │
│ [Last active ghost — faint, top of content] │
│                                              │
│                                             │
│ [Resurfacing ghost — bottom, faint grey]    │
└──────────────────────────────────────────────┘
```

---

## 6. Features — Full Spec

### 6.1 Note Creation

- **Entry point:** Home screen is blank canvas. Click anywhere → cursor appears. First line is always the note title (heading).
- **Autosave:** Every few seconds to `~/handin/notes/`. Silent. No indicator needed.
- **Background GitHub sync:** Every 5 minutes, push all local changes to private repo. Silent.
- **Heading syntax:** `- ` + space at start of line → renders as bold heading inline
- **One font, one size** throughout the note body

### 6.2 Sub-Notes

**Two creation methods:**

1. **Highlight text → right-click or ✦ button → "Make sub-note"**
   - Highlighted text becomes the sub-note title
   - Inline link replaces the selection
   - Sub-note opens immediately to the right (zoom-in transition)

2. **Type `/new-sub-note`**
   - Inline prompt: type name → Enter
   - Sub-note opens immediately (zoom-in transition from that line)

**Navigation:**
- Click link in parent → sub-note zooms in from that word
- Breadcrumb at top: `self-study-cs › databases`
- Escape → zooms back out to parent
- Sub-notes appear as child nodes in graph map, indented under parent in sidebar

### 6.3 Command System

All commands triggered by `/` while writing. Dropdown appears just above the cursor (like Claude's slash menu) showing:
- Command name + small emoji icon
- 2-3 line description
- Ranked by the user's usage frequency (learns over time)
- Updates in real time as user types (e.g. `/add-` filters to all add commands)

**Command List:**

| Command | Behavior |
|---|---|
| `/new-note` | Creates a new note, prompts for title inline |
| `/new-sub-note [name]` | Creates sub-note, name inline after command |
| `/create-tasklist [name]` | Creates named task list instantly, appears in sidebar |
| `/add-task [list] [task name]` | Adds task to specified list with backlink to origin note |
| `/add-reminder [natural language]` | AI parses date/time/task, adds to calendar, emails reminder |
| `/add-image` | Opens file picker, image stored in SQLite DB, renders inline |
| `/scratch` | Opens grey ephemeral note, auto-deletes in 24h |
| `/save` | Used inside scratch note to convert it to a real note (prompts for name) |
| `/history` | Same as clicking clock icon — toggles timestamp layers |

### 6.4 Task System

**Creating tasks:**
- `/add-task self-study-cs "learn about CI/CD pipelines"` while writing a note
- Task is added to `self-study-cs` task list
- Backlink stored: this task originated in `[note name]` at `[line number]`
- From calendar: click a date → type task → one-line dropdown to select task list → Enter

**Task list view:**
- Click task list in sidebar → task overlay slides up over current note
- Note visible in background, dimmed
- Overlay has single X button to close
- Tasks shown as checkboxes with name, due date if set, backlink origin

**Completing a task:**
- Check the checkbox
- handin silently runs: `git commit -m "✓ [task name]" && git push`
- Heat map ticks up
- Overlay stays open

**Orphan tasks:**
- Tasks with no task list assigned are flagged as orphaned
- Suggested home shown: "This task might belong in `self-study-cs`"

**Task + sub-task:**
- Click any task in the overlay → expands inline to show subtasks and a mini-note area
- Click again → collapses to one line
- Never navigates away

**Natural language dates:**
- `/add-reminder "finish chapter 3 by friday"` → chrono-node parses "friday" → stores real date

### 6.5 Git Integration

- **On first launch:** GitHub OAuth. handin creates a private repo called `handin-notes` automatically.
- **Autosave** writes to `~/handin/` every few seconds
- **Background push** every 5 minutes for note content
- **Task completion** = immediate `git commit -m "✓ [task name]" && git push`
- User never sees git. No terminal. No buttons.

### 6.6 Search

- **Search bar:** Always on home screen, top full width
- **Searches:** Note titles, note body content, task names, sub-note titles, image AI descriptions, extracted keywords
- **Method:** Keyword matching first (Fuse.js). If no results → AI semantic search fallback.
- **Keyword extraction:** On every autosave, important keywords are extracted and stored in SQLite metadata silently

### 6.7 AI Features

**Inline summarization / explanation:**
- Select any text → small floating toolbar with ✦ button
- Tap ✦ → summary appears inline below selection
- Works on images too — select image → ✦ → AI describes it
- Context passed to AI: selected content + note title
- User's own API key, stored locally, never hits handin servers

**Command parsing:**
- `/add-reminder` uses AI to parse natural language date/time/task
- chrono-node handles most date parsing; AI as fallback for complex phrases

### 6.8 Graph Map

- **Access:** Last icon in sidebar
- **View:** Full screen takeover, note fades out
- **Nodes:** Each note is a circle. Parent notes larger. Sub-notes smaller, orbiting parent, connected by thinner lines.
- **Orphan notes:** Different color, slightly dimmer. Optional AI nudge: "This note hasn't been linked anywhere — does it belong near `algorithms.md`?"
- **Click a node:** Small preview card — title, first 3 lines, task count
- **Double-click:** Opens the note (zoom-in transition)
- **Exit:** Escape or X button

### 6.9 Serendipitous Resurfacing

- Triggers when you create a new note or type a new heading
- Fuzzy-matches against entire vault silently
- If match found → one faint line at bottom of note: "You wrote something related 6 weeks ago → `databases.md`"
- Muted grey, easy to ignore, click to open
- Disappears on scroll or click

### 6.10 Last Active Ghost

- Appears at top of note content, faint grey
- Shows every time a note is opened: "Last time here you completed: `learn about CI/CD` — 12 days ago"
- Pulled from git log (task commits linked to note)
- Always visible on open, fades after a few seconds of writing

### 6.11 Time-Stamped Edit Layers (History View)

- **Trigger:** Clock icon in top right of every note
- **Behavior:** Timestamps fade in next to sections showing when they were written
- **Toggle off:** Click clock again, timestamps disappear
- **Storage:** `<!-- returned: 2026-06-14 -->` comments in raw markdown, invisible in rendered mode

### 6.12 Scratch Notes (`/scratch`)

- Grey colored note, not in library
- Auto-deletes after 24 hours
- 1 hour before deletion: banner at top: "This note deletes in 1 hour — `/save` to keep it"
- `/save` → prompts for name → becomes real note, moves to library
- If ignored → permanently deleted, no recovery

### 6.13 Heat Map (Account Panel)

- Access: Account button, bottom left
- Shows: GitHub contribution-style heat map of task completions (pulled from git log)
- Also shows: total tasks completed, total notes written, current streak
- Shareable — most social feature in the app

### 6.14 Calendar

- Month view on home screen, bottom right
- Today's date greyed out
- Tasks with due dates shown below calendar grid
- Click any date → add task for that date → one-line task list dropdown → Enter
- Email reminders sent for `/add-reminder` items (email captured on first reminder, never again)

### 6.15 Help System

- `?` button, bottom right of home screen
- Opens a demo scratch note (not in library, not deletable)
- Pre-filled with every command and example usage
- Close it → gone until they hit `?` again

### 6.16 Writer Quotes

- Appear on home screen, faint grey
- Hardcoded curated collection of 50-100 writer quotes
- No AI, no API, works offline, loads instantly
- Can be turned off in Settings

---

## 7. Onboarding Flow

1. Launch handin
2. One screen: "Continue with GitHub" button
3. GitHub OAuth → handin creates `handin-notes` private repo
4. Local `~/handin/` folder created silently
5. Lands on blank home screen
6. Faint placeholder: *"Start writing, or type / for commands"*
7. No tutorial. No tooltips. `?` is always there if needed.

---

## 8. Data Model

### SQLite Schema

```sql
-- Notes metadata
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  file_path TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  parent_id TEXT,  -- for sub-notes
  is_scratch BOOLEAN DEFAULT FALSE,
  scratch_expires_at DATETIME
);

-- Keywords extracted from notes for search
CREATE TABLE note_keywords (
  note_id TEXT,
  keyword TEXT,
  weight REAL,
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- Images stored in DB, referenced in markdown
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  note_id TEXT,
  data BLOB,
  ai_description TEXT,
  created_at DATETIME,
  FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- Task lists
CREATE TABLE task_lists (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  created_at DATETIME
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  list_id TEXT,
  name TEXT,
  origin_note_id TEXT,  -- backlink: which note created this task
  origin_line INTEGER,
  due_date DATETIME,
  completed_at DATETIME,
  git_commit_hash TEXT,  -- populated after commit
  FOREIGN KEY (list_id) REFERENCES task_lists(id),
  FOREIGN KEY (origin_note_id) REFERENCES notes(id)
);

-- Sub-tasks
CREATE TABLE subtasks (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  name TEXT,
  completed_at DATETIME,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Reminders
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  remind_at DATETIME,
  email_sent BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Note connections (for graph map)
CREATE TABLE note_links (
  from_note_id TEXT,
  to_note_id TEXT,
  PRIMARY KEY (from_note_id, to_note_id)
);

-- User settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Dumps (screenshots received from phone)
CREATE TABLE dumps (
  id TEXT PRIMARY KEY,
  image_path TEXT,
  received_at DATETIME,
  ai_classification TEXT,       -- e.g. "event", "task", "receipt", "unknown"
  ai_description TEXT,
  suggested_action TEXT,        -- e.g. "add_to_calendar", "add_to_task", null
  suggested_payload TEXT,       -- JSON: parsed date/task text from AI
  status TEXT DEFAULT 'pending', -- 'pending' | 'archived' | 'discarded'
  resolved_at DATETIME
);
```

---

## 9. File Structure — `~/handin/`

```
~/handin/
├── notes/
│   ├── databases.md
│   ├── algorithms.md
│   └── self-study-cs/
│       ├── index.md
│       └── cicd-pipelines.md   ← sub-note
├── scratch/
│   └── [temp files, auto-cleared]
└── .handin/
    └── handin.db               ← SQLite database
```

---

## 10. Repository Folder Structure

```
handin/
├── electron/
│   ├── main.ts                 ← Electron main process
│   ├── preload.ts              ← Context bridge (IPC)
│   └── ipc/
│       ├── git.ts              ← All git operations (simple-git)
│       ├── files.ts            ← Read/write markdown files
│       ├── db.ts               ← SQLite operations
│       └── auth.ts             ← GitHub OAuth flow
│
├── src/
│   ├── app/
│   │   ├── App.tsx             ← Root component, routing
│   │   └── routes.tsx
│   │
│   ├── screens/
│   │   ├── Home/
│   │   │   ├── index.tsx       ← Home screen layout
│   │   │   ├── Calendar.tsx    ← Month calendar + today tasks
│   │   │   └── Quote.tsx       ← Writer quote display
│   │   ├── Note/
│   │   │   ├── index.tsx       ← Note editor screen
│   │   │   ├── Editor.tsx      ← Core writing area
│   │   │   ├── LastActive.tsx  ← Ghost last-active line
│   │   │   ├── Resurfacing.tsx ← Related note suggestion
│   │   │   └── HistoryView.tsx ← Timestamp layer toggle
│   │   ├── Graph/
│   │   │   ├── index.tsx       ← Graph map full screen
│   │   │   ├── Node.tsx        ← Individual note node
│   │   │   └── Preview.tsx     ← Click preview card
│   │   ├── Dumps/
│   │   │   ├── index.tsx       ← Dumps grid + AI mode toggle
│   │   │   ├── DumpCard.tsx    ← Single screenshot + suggestion card
│   │   │   └── folderWatcher.ts← Watches iCloud Drive dump folder
│   │   └── Account/
│   │       ├── index.tsx       ← Account panel
│   │       └── HeatMap.tsx     ← Git-based heat map
│   │
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── index.tsx       ← Collapsible sidebar
│   │   │   ├── NotesList.tsx
│   │   │   └── TaskLists.tsx
│   │   ├── TaskOverlay/
│   │   │   ├── index.tsx       ← Full task overlay
│   │   │   ├── TaskItem.tsx    ← Single task + inline expand
│   │   │   └── SubTask.tsx
│   │   ├── CommandMenu/
│   │   │   ├── index.tsx       ← Slash command dropdown
│   │   │   ├── CommandItem.tsx
│   │   │   └── commands.ts     ← All command definitions + descriptions
│   │   ├── SearchBar/
│   │   │   └── index.tsx       ← Fuzzy + AI search
│   │   ├── AIToolbar/
│   │   │   └── index.tsx       ← ✦ floating toolbar on selection
│   │   └── HelpNote/
│   │       └── index.tsx       ← Demo scratch note for ?
│   │
│   ├── hooks/
│   │   ├── useAutosave.ts      ← Debounced autosave every few seconds
│   │   ├── useGitSync.ts       ← Background push every 5 min
│   │   ├── useSearch.ts        ← Fuse.js + AI fallback
│   │   ├── useCommands.ts      ← Command frequency tracking
│   │   ├── useResurfacing.ts   ← Related note detection
│   │   └── useAI.ts            ← AI API calls with user key
│   │
│   ├── store/
│   │   ├── notes.ts            ← Notes state
│   │   ├── tasks.ts            ← Tasks + task lists state
│   │   ├── settings.ts         ← User settings (API key, etc.)
│   │   └── ui.ts               ← UI state (sidebar open, etc.)
│   │
│   ├── lib/
│   │   ├── markdown.ts         ← Markdown parser/renderer
│   │   ├── dateParser.ts       ← chrono-node wrapper
│   │   ├── keywords.ts         ← Keyword extraction from notes
│   │   ├── quotes.ts           ← Hardcoded writer quotes
│   │   └── transitions.ts      ← Framer Motion variants
│   │
│   └── styles/
│       ├── globals.css
│       └── tokens.css          ← Design tokens (colors, spacing, font)
│
├── assets/
│   └── icons/
│
├── tests/
│   ├── unit/
│   │   ├── dateParser.test.ts
│   │   ├── keywords.test.ts
│   │   └── search.test.ts
│   └── integration/
│       ├── git.test.ts
│       └── db.test.ts
│
├── package.json
├── tsconfig.json
├── electron-builder.config.js  ← Mac .dmg build config
└── .env.example                ← API key template (never committed)
```

---

## 11. MVP — Minimum Shippable Version

The MVP is the smallest version that still feels complete and unique. Five features only.

### MVP Feature Set

**1. Notes**
- Create notes, autosave to `~/handin/notes/`
- Heading syntax (`- ` + space → bold heading)
- One font, one size
- Click anywhere on home to start writing

**2. GitHub Sync**
- GitHub OAuth on first launch
- Create `handin-notes` private repo automatically
- Background push every 5 minutes, silent

**3. Task System (core only)**
- `/create-tasklist [name]` — creates a named list
- `/add-task [list] [task name]` — adds task with backlink to origin note
- Task overlay (sidebar icon) — checkbox list over dimmed note
- Check task → `git commit -m "✓ [task name]" && git push` silently

**4. Fuzzy Search**
- Fuse.js search across note titles and body content
- Search bar on home screen

**5. Sidebar**
- Collapsible, default open
- Notes list
- Task lists

### What MVP Deliberately Excludes

Graph map, sub-notes, calendar, reminders, email, heat map, scratch notes, resurfacing, history view, AI toolbar, image support, command frequency learning, writer quotes, sub-tasks, natural language dates.

### MVP Folder Structure (Reduced)

```
handin/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
│       ├── git.ts
│       ├── files.ts
│       ├── db.ts
│       └── auth.ts
├── src/
│   ├── screens/
│   │   ├── Home/index.tsx
│   │   └── Note/
│   │       ├── index.tsx
│   │       └── Editor.tsx
│   ├── components/
│   │   ├── Sidebar/index.tsx
│   │   ├── TaskOverlay/index.tsx
│   │   └── CommandMenu/index.tsx
│   ├── hooks/
│   │   ├── useAutosave.ts
│   │   └── useGitSync.ts
│   ├── store/
│   │   ├── notes.ts
│   │   └── tasks.ts
│   └── lib/
│       ├── markdown.ts
│       └── quotes.ts
├── tests/
└── package.json
```

### MVP SQLite Schema (Reduced)

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  file_path TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE task_lists (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  created_at DATETIME
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  list_id TEXT,
  name TEXT,
  origin_note_id TEXT,
  completed_at DATETIME,
  git_commit_hash TEXT
);
```

### MVP Build Order

1. Electron scaffold + GitHub OAuth + repo creation
2. `~/handin/` folder + SQLite setup
3. Home screen + note editor + autosave
4. Background git push
5. `/create-tasklist` + `/add-task` commands + command menu dropdown
6. Task overlay + checkbox completion → git commit
7. Fuzzy search with Fuse.js
8. Sidebar (notes + task lists)

---

## 12. Dumps

**What it does:**
Dumps is a dedicated inbox for screenshots sent from the phone. A screenshot taken on iOS lands inside the Dumps area on the Mac without any manual file transfer. Nothing in Dumps ever auto-creates a note, task, or calendar event — every action requires explicit confirmation. The feature is strictly contained: a dump only becomes part of the rest of the app (a note, a task, a calendar event) when the user deliberately converts it.

**How it looks:**
Dumps renders as a grid of incoming images, newest first. Each image is a square thumbnail; clicking one opens it full size in an overlay. There is no folder hierarchy and no manual sorting — the grid is the entire interface. A small mode toggle sits in the Dumps header to switch between Manual and AI mode (see below). Resolved dumps carry a small checkmark and can be filtered into an "archived" view; nothing is ever deleted automatically.

**Sidebar placement:**
Dumps is its own entry in the sidebar, alongside Tasks and the document list — not nested inside any note or project. It is always reachable in one click and carries a small badge showing the count of unresolved (pending) dumps.

**What it's used for:**
The use case is the gap between "I screenshotted something on my phone" and "it's now stuck on my phone forever." Event flyers, receipts, article screenshots, handwritten notes, code snippets — anything captured on the phone funnels into one place on the Mac, where it can be turned into a note, attached to a task, added to the calendar, or simply discarded.

**How screenshots arrive (no companion app needed):**
- The user installs a free **Apple Shortcut** (distributed via shareable iCloud link, zero App Store cost) that adds a "Share to handin" option to the iOS share sheet.
- Screenshot → Share → "handin" → the Shortcut saves the image into a watched iCloud Drive folder (`~/Library/Mobile Documents/.../handin-dumps/`).
- handin watches that folder on the Mac and pulls new images into the Dumps screen automatically.
- This avoids building or paying for a separate iOS companion app entirely — see "Shipping: Now vs. Later" below.

**Building the Shortcut (reference for build/onboarding):**

1. On iPhone, open the **Shortcuts** app → New Shortcut → name it `handin`.
2. Set "Show in Share Sheet" on (Shortcut Details → toggle "Use as Share Sheet Action") → Accept type: **Images**.
3. Add action: **Save File** (or "Save to iCloud Drive") → set destination folder to `iCloud Drive/handin-dumps/`. First run prompts the user to pick/create this folder once — silent after that.
4. Add action: **Rename File** before saving → set name to current date + time (e.g. `Dump-{timestamp}.png`) so duplicates never collide.
5. Test by screenshotting anything → Share → scroll to `handin` in the share sheet → confirm it lands in the iCloud folder.
6. **Distribution to users:** export the Shortcut as a shareable iCloud link (Shortcuts app → Share → Copy iCloud Link). This link goes in onboarding/the `?` help note — one tap on the phone installs it. No App Store, no review, no account needed on the user's end.
7. On the Mac side, handin's `folderWatcher.ts` watches `~/Library/Mobile Documents/com~apple~CloudDocs/handin-dumps/` (the local mirror of the iCloud folder) for new files and ingests them into the `dumps` table.

### Manual Mode

Manual mode is the default. Dumps appear in the grid as they arrive; nothing happens automatically. Clicking an image opens it full size, and from there the user chooses one of: convert to a note, attach to an existing task, create a calendar event, or discard. No classification, no suggestions — purely a holding pen the user clears at their own pace.

### AI Mode

AI mode is a toggle in the Dumps header. With it on, each new dump is analyzed automatically:
- The AI classifies the image (event flyer, receipt, article screenshot, code snippet, handwritten note, meme, etc.).
- If it looks actionable (a date/time, a task-like instruction, a deadline) an inline suggestion card appears under the image — e.g. *"This looks like an event on July 31, 7pm — Add to calendar?"* or *"This looks like a task — Add to a list?"* (the latter opens the same one-line task-list dropdown used elsewhere in the app).
- If not actionable, the AI shows a one-line description only — no prompt, no nagging.
- Nothing leaves Dumps automatically. Every suggestion requires an explicit Yes/No. Declining leaves the dump as-is with no repeat prompts.
- Confirmed dumps get a checkmark and move into the "archived" filter — they are never deleted automatically and never appear outside Dumps as a "ghost" item elsewhere in the app.

AI mode is a recommender, not an autonomous agent: it suggests, the user decides, and the boundary of Dumps is never crossed without a click.

### Shipping: Now vs. Later

**What costs money:**
- Apple Developer Program: $99/year — required to code-sign and notarize the Mac app so Gatekeeper doesn't show an "unidentified developer" warning on launch.
- A companion iOS app under the App Store would fall under the same $99/year membership — not required, since Dumps uses Shortcuts instead of a native iOS app.

**How Dumps avoids the iOS app cost:**
The phone side is a free Apple Shortcut, distributed via shareable iCloud link — no App Store submission, no review, no fee. It writes into a watched iCloud Drive folder that the Mac app reads. Zero iOS development, zero additional Apple cost.

**Mac signing options:**

| Option | Cost | Trade-off |
|---|---|---|
| Ship unsigned | $0 | Users right-click → Open, or run a one-line Terminal command to bypass Gatekeeper. Suitable for personal use and a small beta group. Not suitable for a public landing page. |
| Apple Developer Program | $99/year | Clean install, no Gatekeeper warning. Required before public distribution to strangers. |

**Decision:** ship unsigned through personal use and beta testing, with Dumps fully functional via the free Shortcut. Pay the $99/year only at the point of public launch. This is a distribution-only decision — it does not affect any feature in this spec.

---

*handin — your notes, your git, your rules.*
