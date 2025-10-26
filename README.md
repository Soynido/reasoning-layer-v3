# 🧠 Reasoning Layer V3

**Technical Decision Intelligence System** - VS Code/Cursor Extension

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Soynido/reasoning-layer-v3)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)](https://code.visualstudio.com/)

## 🎯 Overview

Reasoning Layer V3 is a VS Code/Cursor extension that automatically captures your development process and structures your technical decisions with ADRs (Architectural Decision Records).

**Philosophy**: "Simplicity, stability, explicit serialization, evolutive strata"

## 🏗️ Local-First JSON Persistence Architecture

**Core technical decision**: No PostgreSQL, no external database. Each project manages its own versioned `.reasoning/` directory.

**Mandatory pattern**: All data must be able to:
1. ✅ Be serialized with `JSON.stringify()`
2. ✅ Be read directly from `.reasoning/` without server
3. ✅ Be exported as a single portable `.reasonpack` file

### Advantages

- ✅ **Zero configuration**: works immediately
- ✅ **Git versionable**: `.reasoning/` in the repo
- ✅ **Portable**: copy `.reasoning/` = copy all intelligence
- ✅ **No server**: no external dependency
- ✅ **Offline-first**: works without connection
- ✅ **Multi-project**: each workspace is isolated

## 🚀 Installation

### Prerequisites

- VS Code or Cursor 1.85+
- Node.js 20.19.5+ (LTS)
- Git (for commit capture)

### Installation from source code

```bash
# Clone the repository
git clone https://github.com/Soynido/reasoning-layer-v3.git
cd reasoning-layer-v3

# Install dependencies
npm install

# Compile the extension
npm run build

# Install the extension in VS Code
code --install-extension reasoning-layer-v3-1.0.0.vsix
```

### Installation from GitHub (coming soon)

```bash
# Via VS Code Marketplace (coming soon)
# Or via GitHub Releases (coming soon)
```

## 📁 Project Structure

```
Reasoning Layer V3/
├── extension/                    # Extension source code
│   ├── core/                    # Core Layer (J+0 → J+10)
│   │   ├── PersistenceManager.ts # JSON persistence management
│   │   ├── CaptureEngine.ts      # Event capture + Git
│   │   └── types/
│   │       └── index.ts          # TypeScript types
│   ├── commands/                # VS Code commands (Strate 2)
│   ├── webview/                 # User interface (Strate 3)
│   └── extension.ts             # Main entry point
├── .reasoning/                  # Project data (auto-created)
│   ├── manifest.json           # Project metadata
│   ├── traces/                 # Captured events by date
│   │   └── YYYY-MM-DD.json    # Daily trace files
│   └── adrs/                   # ADRs (Strate 2)
├── package.json                # Extension configuration
├── tsconfig.json               # TypeScript configuration
├── webpack.config.js           # Build configuration
├── PLAN.md                     # Detailed construction plan
├── TASKS.md                    # Task tracking
└── REASONING_LAYER_V2_V3_TRANSFER.md # V2 → V3 audit
```

## 🎮 Usage

### Available Commands

| Command | Description | Status |
|---------|-------------|--------|
| `🧠 Initialize Reasoning Layer` | Initialize the extension | ✅ Strate 1 |
| `📋 Show Output Channel` | Display logs | ✅ Strate 1 |
| `📸 Capture Now` | Manual capture | ✅ Strate 1 |
| `📝 Create ADR` | Create an ADR | ⏳ Strate 2 |
| `📋 List ADRs` | List ADRs | ⏳ Strate 2 |
| `🔍 Validate Project` | Validate project | ⏳ Strate 2 |

### Typical Workflow

1. **Open a workspace** → Extension activates automatically
2. **Normal development** → Automatic capture of files and Git commits
3. **Create ADR** → `Ctrl+Shift+P` → "Create ADR" (Strate 2)
4. **Consultation** → `Ctrl+Shift+P` → "Show Output Channel" to see logs

## 📊 Features by Strate

### 🟢 Strate 1: Core Layer (J+0 → J+10) - ✅ IN PROGRESS

**Objective**: Installable extension with event capture and functional persistence.

**Features**:
- ✅ Automatic file change capture (2s debounce)
- ✅ Automatic Git commit capture (5s polling)
- ✅ Persistence in `.reasoning/traces/YYYY-MM-DD.json`
- ✅ OutputChannel with emoji logs
- ✅ Basic VS Code commands
- ✅ Explicit serialization (0 "An object could not be cloned" errors)

### 🟡 Strate 2: Cognitive Layer (J+10 → J+20) - ⏳ PENDING

**Objective**: Technical decision structuring with ADRs and Zod validation.

**Planned features**:
- ⏳ RBOM Types & Zod validation
- ⏳ RBOMEngine (simple CRUD)
- ⏳ VS Code RBOM commands
- ⏳ evidenceIds links between ADRs and events

### 🔵 Strate 3: Perceptual Layer (J+20 → J+30) - ⏳ PENDING

**Objective**: Simple user interface, V2 migration, and basic analytics.

**Planned features**:
- ⏳ Vanilla HTML/CSS/JS webview
- ⏳ V2 → V3 migration (read-only)
- ⏳ Tests & Documentation
- ⏳ `.reasonpack` export

## 🔧 Development

### Available Scripts

```bash
# TypeScript compilation
npm run compile

# Webpack build
npm run build

# Development watch mode
npm run dev

# Unit tests
npm run test

# Package extension
npm run package
```

### Configuration

The extension uses a progressive 3-strata architecture:

1. **Core Layer**: Capture + Persistence (J+0 → J+10)
2. **Cognitive Layer**: RBOM Engine + ADRs (J+10 → J+20)
3. **Perceptual Layer**: Webview + Migration (J+20 → J+30)

### Testing

```bash
# Unit tests
npm test

# Manual tests
npm run build
code --install-extension reasoning-layer-v3-1.0.0.vsix
```

## 📈 Success Metrics

### Strate 1 (J+10)
- ✅ Extension activatable in < 2s
- ✅ Phase 1 activation < 500ms
- ⏳ Git capture functional
- ⏳ `.reasoning/traces/` persistence

### Strate 2 (J+20)
- ⏳ ADR creation in < 30s
- ⏳ Zod validation 100% coverage
- ⏳ Complete ADR CRUD

### Strate 3 (J+30)
- ⏳ Webview load < 1s
- ⏳ V2 migration without loss
- ⏳ 0 serialization errors
- ⏳ Package size < 5MB

## 🧠 Lessons from V2

### ✅ Patterns Kept from V2
- RepoPersistenceManager: OutputChannel, emoji logging, 30s auto-save
- EventAggregator: File debouncing with Map<string, Timeout>
- Robust filtering: Regex patterns to exclude `.git/`, `node_modules/`
- Explicit serialization: deepSanitize() function for Map, Set, Date, URI

### ❌ Errors Avoided from V2
- Passing VS Code objects to webview (causes "An object could not be cloned")
- Overly complex ReasoningManager (561 lines, too many responsibilities)
- Simultaneous activation (creating 8 components at once)
- AnalyticsEngine/MetricsCollector (non-serializable Map, Timeout)
- React Router (unnecessary complexity - start with vanilla HTML/CSS/JS)

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create a branch**: `feature/feature-name`
3. **Develop** following the defined strata
4. **Test** with `npm test`
5. **Commit**: `git commit -m "feat: description"`
6. **Push**: `git push origin feature/feature-name`
7. **Pull Request** to `main`

### Code Standards

- **TypeScript strict mode** mandatory
- **Explicit serialization** everywhere
- **Unit tests** for each component
- **Documentation** of public interfaces
- **Emoji logging** for readability

## 📄 License

MIT License - see [LICENSE](LICENSE) for more details.

## 🔗 Useful Links

- [Construction Plan](PLAN.md) - Detailed architecture
- [Task Tracking](TASKS.md) - Progress status
- [V2 → V3 Audit](REASONING_LAYER_V2_V3_TRANSFER.md) - Lessons learned
- [GitHub Repository](https://github.com/Soynido/reasoning-layer-v3)

---

**Developed with ❤️ to improve technical decision quality**
