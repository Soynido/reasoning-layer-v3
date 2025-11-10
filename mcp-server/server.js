#!/usr/bin/env node
/**
 * RL4 MCP Server - Read-Only API
 * 
 * Exposes RL4 cognitive state to Cursor via MCP protocol
 * Port: 4010
 * Permissions: Read-only (no writes to kernel)
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4010;
const RL4_PATH = path.resolve(__dirname, "../.reasoning_rl4");

/**
 * Safe JSON read with error handling
 */
function safeRead(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
        return null;
    }
}

/**
 * Query ADRs by keyword
 */
app.get("/query", (req, res) => {
    const q = (req.query.q || "").toLowerCase();
    const adrsDir = path.join(RL4_PATH, "adrs/auto");
    
    if (!fs.existsSync(adrsDir)) {
        return res.json([]);
    }
    
    const files = fs.readdirSync(adrsDir).filter(f => f.endsWith(".json"));
    const results = files
        .map(f => safeRead(path.join(adrsDir, f)))
        .filter(a => a?.title?.toLowerCase().includes(q))
        .map(a => ({
            id: a.id,
            title: a.title,
            decision: a.decision,
            confidence: a.confidence,
            status: a.status
        }));
    
    res.json(results);
});

/**
 * Get cognitive state (forecasts + correlations)
 */
app.get("/state", (req, res) => {
    const forecasts = safeRead(path.join(RL4_PATH, "forecasts.json")) || [];
    const correlations = safeRead(path.join(RL4_PATH, "correlations.json")) || [];
    const patterns = safeRead(path.join(RL4_PATH, "patterns.json")) || { patterns: [] };
    
    res.json({
        forecasts: forecasts.slice(0, 10),
        correlations: correlations.slice(0, 10),
        patterns: (patterns.patterns || []).slice(0, 5),
        summary: {
            total_forecasts: forecasts.length,
            total_correlations: correlations.length,
            total_patterns: (patterns.patterns || []).length
        }
    });
});

/**
 * Get feedback metrics
 */
app.get("/feedback", (req, res) => {
    const report = safeRead(path.join(RL4_PATH, "feedback_report.json"));
    res.json(report || { error: "No feedback report available" });
});

/**
 * Get kernel status
 */
app.get("/status", (req, res) => {
    const cyclesPath = path.join(RL4_PATH, "ledger/cycles.jsonl");
    let totalCycles = 0;
    let lastCycle = null;
    
    try {
        const lines = fs.readFileSync(cyclesPath, "utf-8").trim().split("\n");
        totalCycles = lines.length;
        if (lines.length > 0) {
            lastCycle = JSON.parse(lines[lines.length - 1]);
        }
    } catch {}
    
    res.json({
        status: "operational",
        total_cycles: totalCycles,
        last_cycle: lastCycle ? {
            id: lastCycle.cycleId,
            timestamp: lastCycle.timestamp,
            phases: lastCycle.phases
        } : null
    });
});

/**
 * MCP Manifest
 */
app.get("/.well-known/mcp/rl4.json", (req, res) => {
    res.json({
        name: "RL4 Kernel MCP",
        description: "Read-only access to Reasoning Layer 4 cognitive state",
        version: "1.0.0",
        endpoints: {
            health: "http://localhost:4010/health",
            status: "http://localhost:4010/status",
            query: "http://localhost:4010/query?q=",
            state: "http://localhost:4010/state",
            feedback: "http://localhost:4010/feedback"
        },
        permissions: {
            read: true,
            write: false,
            execute: false
        },
        capabilities: [
            "query_adrs",
            "read_cognitive_state",
            "read_feedback_metrics",
            "read_kernel_status"
        ]
    });
});

/**
 * Health check
 */
app.get("/health", (req, res) => {
    res.json({ status: "ok", server: "RL4 MCP", version: "1.0.0" });
});

// Start server
app.listen(PORT, () => {
    console.log(`🧠 RL4 MCP Server running on http://localhost:${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET /query?q=<keyword>  - Search ADRs`);
    console.log(`   GET /state              - Get cognitive state`);
    console.log(`   GET /feedback           - Get feedback metrics`);
    console.log(`   GET /status             - Get kernel status`);
    console.log(`   GET /health             - Health check`);
    console.log(``);
    console.log(`🔒 Read-only mode (no writes to kernel)`);
});

