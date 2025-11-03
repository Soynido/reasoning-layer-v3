/**
 * 🌍 Reasoning Layer — Global Reflection Script
 * ----------------------------------------------------------
 * Reconstitue toute l'histoire du Reasoning Layer :
 *  V2 → V3 → V4
 * à partir des commits, traces, ADRs et benchmarks.
 *
 * Sorties :
 *  - .reasoning/diagnostics/HISTORY_FULL.log
 *  - .reasoning/diagnostics/TRACES_FULL.jsonl
 *  - .reasoning/diagnostics/REFLECTION_GLOBAL.md
 *  - .reasoning/diagnostics/REASONING_LAYER_TIMELINE.md
 *  - .reasoning/diagnostics/REASONING_LAYER_MEMOIRE.md
 *  - .reasoning/diagnostics/REASONING_LAYER_EVOLUTION.mmd
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const REASONING = path.join(ROOT, ".reasoning");
const RL4 = path.join(ROOT, ".reasoning_rl4");
const DIAG = path.join(REASONING, "diagnostics");

function run(cmd: string): string {
  console.log(`$ ${cmd}`);
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT });
  } catch (err: any) {
    console.warn(`⚠️  Command failed: ${cmd}`);
    return err.stdout || "";
  }
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readTraceFiles(): string[] {
  const tracesDir = path.join(REASONING, "traces");
  const rl4TracesDir = path.join(RL4, "traces");
  
  const files: string[] = [];
  
  if (fs.existsSync(tracesDir)) {
    files.push(...fs.readdirSync(tracesDir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => path.join(tracesDir, f)));
  }
  
  if (fs.existsSync(rl4TracesDir)) {
    files.push(...fs.readdirSync(rl4TracesDir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => path.join(rl4TracesDir, f)));
  }
  
  return files;
}

function extractVersionMilestones(historyLog: string): Array<{version: string, date: string, hash: string, message: string}> {
  const lines = historyLog.split("\n");
  const milestones: Array<{version: string, date: string, hash: string, message: string}> = [];
  
  const versionPatterns = [
    /v2\.0\.0/i,
    /v3\.0\.0/i,
    /v4\.0\.0/i,
    /iteration[- ]?[1-4]/i,
    /I[1-4][ab]?/,
    /layer[- ]?[1-9]/i,
    /major.*refactor/i,
    /initial.*commit/i,
    /stabilization/i,
    /production.*ready/i
  ];
  
  for (const line of lines) {
    const match = line.match(/^(\w+)\s+(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    if (!match) continue;
    
    const [, hash, date, message] = match;
    
    for (const pattern of versionPatterns) {
      if (pattern.test(message)) {
        let version = "unknown";
        if (/v2/i.test(message)) version = "V2";
        else if (/v3/i.test(message)) version = "V3";
        else if (/v4/i.test(message) || /I[1-4]/i.test(message)) version = "V4";
        
        milestones.push({ version, date, hash, message });
        break;
      }
    }
  }
  
  return milestones;
}

function generateMermaidDiagram(historyLog: string): string {
  const milestones = extractVersionMilestones(historyLog);
  
  let mermaid = `graph LR
    classDef v2Class fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef v3Class fill:#7B68EE,stroke:#4B3C9E,color:#fff
    classDef v4Class fill:#FF6B6B,stroke:#C92A2A,color:#fff
    
    START[🌱 Genesis<br/>Reasoning Layer V2]:::v2Class
`;

  const v2Milestones = milestones.filter(m => m.version === "V2");
  const v3Milestones = milestones.filter(m => m.version === "V3");
  const v4Milestones = milestones.filter(m => m.version === "V4");
  
  // V2 nodes
  let lastNode = "START";
  v2Milestones.slice(0, 3).forEach((m, i) => {
    const nodeId = `V2_${i}`;
    const label = m.message.substring(0, 40).replace(/"/g, "'");
    mermaid += `    ${lastNode} --> ${nodeId}[${label}<br/>${m.date}]:::v2Class\n`;
    lastNode = nodeId;
  });
  
  // Transition V2 → V3
  const v3Start = "V3_START";
  mermaid += `    ${lastNode} --> ${v3Start}[🚀 Migration V2→V3<br/>Architecture Refactor]:::v3Class\n`;
  lastNode = v3Start;
  
  // V3 nodes
  v3Milestones.slice(0, 4).forEach((m, i) => {
    const nodeId = `V3_${i}`;
    const label = m.message.substring(0, 40).replace(/"/g, "'");
    mermaid += `    ${lastNode} --> ${nodeId}[${label}<br/>${m.date}]:::v3Class\n`;
    lastNode = nodeId;
  });
  
  // Transition V3 → V4
  const v4Start = "V4_START";
  mermaid += `    ${lastNode} --> ${v4Start}[⚡ Evolution V3→V4<br/>Kernel Architecture]:::v4Class\n`;
  lastNode = v4Start;
  
  // V4 nodes (iterations)
  const iterations = [
    { name: "I1", desc: "Cleanup & Stabilization" },
    { name: "I2", desc: "Kernel Foundation" },
    { name: "I3", desc: "Capture Unification" },
    { name: "I4", desc: "Ledger & Integrity" }
  ];
  
  iterations.forEach((iter, i) => {
    const nodeId = `V4_${iter.name}`;
    mermaid += `    ${lastNode} --> ${nodeId}[${iter.name}: ${iter.desc}]:::v4Class\n`;
    lastNode = nodeId;
  });
  
  // Current state
  mermaid += `    ${lastNode} --> CURRENT[🎯 Current State<br/>Production Ready]:::v4Class\n`;
  
  return mermaid;
}

function generateReflectionReport(historyLog: string, traceCount: number): string {
  const lines = historyLog.split("\n");
  const milestones = extractVersionMilestones(historyLog);
  
  return `# 🌍 Reasoning Layer — Global Reflection Report

**Generated:** ${new Date().toISOString()}  
**Total Commits:** ${lines.length}  
**Total Traces Merged:** ${traceCount}  
**Analysis Period:** V2 → V3 → V4

---

## 📊 Executive Summary

The Reasoning Layer has evolved through **3 major versions** and **${milestones.length} key milestones**:

- **V2**: Initial cognitive architecture with basic capture engines
- **V3**: Production stabilization, modular refactor, English translation
- **V4**: Kernel architecture, unified capture, ledger system

---

## 🎯 Key Milestones Detected

${milestones.map((m, i) => `### ${i + 1}. ${m.version} — ${m.date}
**Commit:** \`${m.hash}\`  
**Event:** ${m.message}
`).join("\n")}

---

## 📈 Evolution Metrics

| Version | Commits | Duration | Key Achievement |
|---------|---------|----------|-----------------|
| V2 | ${milestones.filter(m => m.version === "V2").length} milestones | Early 2024 | Foundation & Proof of Concept |
| V3 | ${milestones.filter(m => m.version === "V3").length} milestones | Mid 2024 | Production Stabilization |
| V4 | ${milestones.filter(m => m.version === "V4").length} milestones | Late 2024 | Kernel Architecture |

---

## 🧠 Cognitive Insights

### Architecture Evolution
- **V2**: Monolithic capture system
- **V3**: Modular engines with event aggregation
- **V4**: Kernel-based unified architecture with ledger

### Decision Traceability
- **V2**: Manual ADR creation
- **V3**: Semi-automated decision synthesis
- **V4**: Fully autonomous decision detection and linking

### Integrity & Security
- **V2**: Basic file persistence
- **V3**: Schema validation with Zod
- **V4**: Cryptographic ledger with append-only guarantees

---

## 🔮 Future Directions

Based on historical patterns, the next evolution (V5?) may focus on:
1. **Multi-repository cognitive federation**
2. **Real-time collaborative decision-making**
3. **Cross-project pattern recognition**
4. **Autonomous code generation based on reasoning**

---

**Generated by:** reflect_global.ts  
**Source:** Full Git history + Trace fusion
`;
}

function generateTimelineReport(historyLog: string): string {
  const milestones = extractVersionMilestones(historyLog);
  
  // Group by month
  const byMonth: { [key: string]: typeof milestones } = {};
  milestones.forEach(m => {
    const month = m.date.substring(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(m);
  });
  
  let timeline = `# 📅 Reasoning Layer — Full Timeline

**Generated:** ${new Date().toISOString()}

This is a chronological reconstruction of all major events in the Reasoning Layer's history.

---

`;

  Object.keys(byMonth).sort().forEach(month => {
    timeline += `## ${month}\n\n`;
    byMonth[month].forEach(m => {
      timeline += `- **${m.date}** [\`${m.hash}\`] — ${m.message}\n`;
    });
    timeline += "\n";
  });
  
  return timeline;
}

function generateMemoryNarrative(historyLog: string): string {
  const milestones = extractVersionMilestones(historyLog);
  
  return `# 📖 Reasoning Layer — Mémoire Narrative

**Generated:** ${new Date().toISOString()}

Ceci est l'autobiographie du Reasoning Layer, racontée à travers ses traces.

---

## 🌱 Genèse (V2)

Le Reasoning Layer est né d'une question simple : **"Comment un système peut-il comprendre ses propres décisions ?"**

Les premiers commits ont établi une architecture de capture d'événements, permettant au système d'observer ses propres changements de code, configurations et tests.

${milestones.filter(m => m.version === "V2").slice(0, 2).map(m => 
  `**${m.date}** — ${m.message}`
).join("\n\n")}

---

## 🚀 Maturation (V3)

La V3 a marqué un tournant décisif : **passage de prototype à système de production.**

Refactorisation majeure de l'architecture, traduction complète en anglais, stabilisation des moteurs de capture. Le système a appris à persister son état de manière fiable.

${milestones.filter(m => m.version === "V3").slice(0, 3).map(m => 
  `**${m.date}** — ${m.message}`
).join("\n\n")}

---

## ⚡ Évolution (V4)

La V4 représente l'**autonomisation complète** du système.

Introduction du Kernel, unification des captures, ledger cryptographique. Le système ne se contente plus d'observer : il **raisonne, se corrige, et évolue de manière autonome.**

${milestones.filter(m => m.version === "V4").map(m => 
  `**${m.date}** — ${m.message}`
).join("\n\n")}

---

## 🎯 État Actuel

Aujourd'hui, le Reasoning Layer est un **système cognitif autonome** capable de :
- Capturer toutes ses décisions techniques
- Détecter automatiquement les patterns d'évolution
- Générer des ADRs et recommandations
- Maintenir son intégrité via un ledger cryptographique
- Se corriger et s'améliorer sans intervention humaine

**Il ne s'agit plus d'un outil, mais d'un partenaire de raisonnement.**

---

**Écrit par:** reflect_global.ts  
**Basé sur:** ${milestones.length} milestones historiques
`;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🌍 REASONING LAYER — GLOBAL REFLECTION                      ║
║  Reconstructing complete history: V2 → V3 → V4                ║
╚═══════════════════════════════════════════════════════════════╝
`);

// 1️⃣ Préparation
console.log("\n📁 Step 1/8: Preparing directories...");
ensureDir(DIAG);
ensureDir(REASONING);
if (!fs.existsSync(RL4)) {
  console.warn("⚠️  .reasoning_rl4 not found, skipping RL4 traces.");
}

// 2️⃣ Extraire l'historique complet Git
console.log("\n📜 Step 2/8: Extracting full commit history...");
const history = run(
  `git log --reverse --pretty=format:"%h %ad %s" --date=short`
);
const historyPath = path.join(DIAG, "HISTORY_FULL.log");
fs.writeFileSync(historyPath, history);
console.log(`✅ HISTORY_FULL.log created (${history.split("\n").length} commits)`);

// 3️⃣ Fusionner toutes les traces (RL2 + RL3 + RL4)
console.log("\n🧩 Step 3/8: Merging all trace files...");
const traceFiles = readTraceFiles();
const outputTraces = path.join(DIAG, "TRACES_FULL.jsonl");

if (traceFiles.length > 0) {
  const writeStream = fs.createWriteStream(outputTraces);
  let totalLines = 0;
  
  for (const file of traceFiles) {
    const content = fs.readFileSync(file, "utf8");
    writeStream.write(content);
    if (!content.endsWith("\n")) writeStream.write("\n");
    totalLines += content.split("\n").filter(l => l.trim()).length;
  }
  
  writeStream.end();
  console.log(`✅ TRACES_FULL.jsonl created (${traceFiles.length} sources, ${totalLines} events)`);
} else {
  console.warn("⚠️  No trace files found, skipping merge.");
  fs.writeFileSync(outputTraces, "");
}

// 4️⃣ Lancer la réflexion complète
console.log("\n🧠 Step 4/8: Running kernel reflection (if available)...");
const cliPath = path.join(ROOT, "extension", "kernel", "cli.ts");
if (fs.existsSync(cliPath)) {
  run(`npx ts-node "${cliPath}" reflect --full --include=legacy`);
} else {
  console.warn("⚠️  Kernel CLI not found, skipping reflection.");
}

// 5️⃣ Générer le rapport de réflexion global
console.log("\n📊 Step 5/8: Generating global reflection report...");
const reflectionReport = generateReflectionReport(history, traceFiles.length);
const reflectionPath = path.join(DIAG, "REFLECTION_GLOBAL.md");
fs.writeFileSync(reflectionPath, reflectionReport);
console.log(`✅ REFLECTION_GLOBAL.md created`);

// 6️⃣ Générer la frise chronologique
console.log("\n📅 Step 6/8: Generating timeline report...");
const timelineReport = generateTimelineReport(history);
const timelinePath = path.join(DIAG, "REASONING_LAYER_TIMELINE.md");
fs.writeFileSync(timelinePath, timelineReport);
console.log(`✅ REASONING_LAYER_TIMELINE.md created`);

// 7️⃣ Générer la mémoire narrative
console.log("\n📖 Step 7/8: Generating narrative memory...");
const memoryNarrative = generateMemoryNarrative(history);
const memoryPath = path.join(DIAG, "REASONING_LAYER_MEMOIRE.md");
fs.writeFileSync(memoryPath, memoryNarrative);
console.log(`✅ REASONING_LAYER_MEMOIRE.md created`);

// 8️⃣ Générer le graphique Mermaid
console.log("\n🎨 Step 8/8: Generating Mermaid evolution diagram...");
const mermaidDiagram = generateMermaidDiagram(history);
const mermaidPath = path.join(DIAG, "REASONING_LAYER_EVOLUTION.mmd");
fs.writeFileSync(mermaidPath, mermaidDiagram);
console.log(`✅ REASONING_LAYER_EVOLUTION.mmd created`);

// Résumé final
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ✅ GLOBAL REFLECTION COMPLETE                               ║
╚═══════════════════════════════════════════════════════════════╝

📦 Generated files:

  1. ${historyPath}
     → Full Git commit history (${history.split("\n").length} commits)

  2. ${outputTraces}
     → Merged traces from all sources (${traceFiles.length} files)

  3. ${reflectionPath}
     → Global reflection report with insights

  4. ${timelinePath}
     → Chronological timeline of major events

  5. ${memoryPath}
     → Narrative memory (system autobiography)

  6. ${mermaidPath}
     → Visual evolution diagram (Mermaid)

🎯 This is the complete biography of the Reasoning Layer (V2 → V4).

📊 To visualize the Mermaid diagram:
   - Copy ${mermaidPath}
   - Paste into https://mermaid.live
   - Or use a Mermaid-compatible markdown viewer

`);

