/**
 * WhereAmI Snapshot Generator - Real-time Cognitive Context API
 * 
 * Generates dynamic Markdown snapshots reflecting workspace state:
 * - Current focus (open files, recently viewed)
 * - Active patterns and forecasts
 * - Cognitive load and mental state
 * - Temporal anchoring (cycle, timestamp)
 * 
 * Used by:
 * - WebView UI (real-time dashboard)
 * - Chat Agent (context awareness - "Where am I?")
 * - CLI tools (debugging, exploration)
 * 
 * Complements:
 * - ContextSnapshotManager (Level 6 external evidence)
 * - StateReconstructor (historical state reconstruction)
 * 
 * RL4 Kernel API Component
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Cognitive snapshot data structure (compatible with RL4 Store)
 * This is the minimal contract expected by useRL4Store()
 */
export interface CognitiveSnapshot {
  cycleId: number;
  timestamp: string;
  focusedFile?: string;
  recentlyViewed?: string[];
  patterns?: { id: string; confidence: number; trend?: string }[];
  forecasts?: { predicted: string; confidence: number }[];
  mood?: string;
  confidence?: number;
}

/**
 * Generate "Where Am I?" Markdown snapshot
 * 
 * @param root - RL4 data directory (default: .reasoning_rl4)
 * @returns Formatted Markdown string
 */
export async function generateWhereAmI(root?: string): Promise<string> {
  const rl4Root = root || path.join(process.cwd(), '.reasoning_rl4');
  
  const snapshot: CognitiveSnapshot = {
    cycleId: 0,
    timestamp: new Date().toISOString(),
  };

  // 1. Load current cycle
  try {
    const cyclesPath = path.join(rl4Root, 'ledger', 'cycles.jsonl');
    if (fs.existsSync(cyclesPath)) {
      const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const latestCycle = JSON.parse(lines[lines.length - 1]);
        snapshot.cycleId = latestCycle.cycleId || 0;
        snapshot.timestamp = latestCycle.timestamp || snapshot.timestamp;
      }
    }
  } catch (error) {
    // Silent fail - use defaults
  }

  // 2. Load IDE activity (focused file, recently viewed)
  try {
    const ideActivityPath = path.join(rl4Root, 'traces', 'ide_activity.jsonl');
    if (fs.existsSync(ideActivityPath)) {
      const lines = fs.readFileSync(ideActivityPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const latestActivity = JSON.parse(lines[lines.length - 1]);
        const metadata = latestActivity.metadata || {};
        
        if (metadata.focused_file?.path) {
          snapshot.focusedFile = metadata.focused_file.path;
        }
        
        if (Array.isArray(metadata.recently_viewed)) {
          snapshot.recentlyViewed = metadata.recently_viewed
            .slice(0, 5) // Limit to 5 most recent
            .map((item: any) => typeof item === 'string' ? item : item.path)
            .filter(Boolean);
        }
      }
    }
  } catch (error) {
    // Silent fail - no IDE activity
  }

  // 3. Load active patterns
  try {
    const patternsPath = path.join(rl4Root, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
      if (Array.isArray(patternsData.patterns)) {
        snapshot.patterns = patternsData.patterns
          .slice(-3) // Last 3 patterns
          .map((p: any) => ({
            id: p.pattern_id || p.id || 'unknown',
            confidence: p.confidence || 0,
            trend: p.trend || 'stable',
          }));
      }
    }
  } catch (error) {
    // Silent fail - no patterns
  }

  // 4. Load active forecasts
  try {
    const forecastsPath = path.join(rl4Root, 'forecasts.json');
    if (fs.existsSync(forecastsPath)) {
      const forecastsData = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
      // Handle both array format [...] and object format {forecasts: [...]}
      const forecastsArray = Array.isArray(forecastsData) ? forecastsData : (forecastsData.forecasts || []);
      
      if (forecastsArray.length > 0) {
        snapshot.forecasts = forecastsArray
          .slice(-3) // Last 3 forecasts
          .map((f: any) => ({
            predicted: f.predicted_decision || f.predicted || f.description || 'Unknown',
            confidence: f.confidence || 0,
          }));
      }
    }
  } catch (error) {
    // Silent fail - no forecasts
  }

  // 5. Load mental state (if available)
  try {
    const mentalStatePath = path.join(rl4Root, 'mental_state.json');
    if (fs.existsSync(mentalStatePath)) {
      const mentalState = JSON.parse(fs.readFileSync(mentalStatePath, 'utf-8'));
      snapshot.mood = mentalState.mood || undefined;
      snapshot.confidence = mentalState.confidence || undefined;
    }
  } catch (error) {
    // Silent fail - no mental state
  }

  // --- Generate Markdown ---
  return formatMarkdownSnapshot(snapshot);
}

/**
 * Format cognitive snapshot as Markdown
 */
function formatMarkdownSnapshot(snapshot: CognitiveSnapshot): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# 🧠 Where Am I? — RL4 Cognitive Snapshot');
  lines.push('');
  lines.push(`**Generated at**: ${new Date().toLocaleString('fr-FR', { 
    dateStyle: 'full', 
    timeStyle: 'medium' 
  })}`);
  lines.push(`**Cycle**: ${snapshot.cycleId || 'N/A'}`);
  
  if (snapshot.mood && snapshot.confidence !== undefined) {
    const confidencePercent = Math.round(snapshot.confidence * 100);
    lines.push(`**Mood**: ${snapshot.mood} (${confidencePercent}% confidence)`);
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');

  // Current Context
  lines.push('## 📍 Current Context');
  lines.push('');
  
  if (snapshot.focusedFile) {
    lines.push(`Currently focused on: \`${snapshot.focusedFile}\``);
  } else {
    lines.push('No active file currently focused.');
  }
  
  if (snapshot.recentlyViewed && snapshot.recentlyViewed.length > 0) {
    lines.push('');
    lines.push('**Recently viewed**:');
    snapshot.recentlyViewed.forEach(file => {
      lines.push(`- \`${file}\``);
    });
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');

  // Cognitive Patterns
  lines.push('## 🔍 Cognitive Patterns');
  lines.push('');
  
  if (snapshot.patterns && snapshot.patterns.length > 0) {
    snapshot.patterns.forEach(p => {
      const confidencePercent = Math.round(p.confidence * 100);
      const trendEmoji = p.trend === 'increasing' ? '📈' : p.trend === 'decreasing' ? '📉' : '➡️';
      lines.push(`- **${p.id}** (${confidencePercent}% confidence, ${trendEmoji} ${p.trend})`);
    });
  } else {
    lines.push('No recent patterns detected.');
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');

  // Forecasts
  lines.push('## 📈 Forecasts');
  lines.push('');
  
  if (snapshot.forecasts && snapshot.forecasts.length > 0) {
    snapshot.forecasts.forEach(f => {
      const confidencePercent = Math.round(f.confidence * 100);
      lines.push(`- *${f.predicted}* (${confidencePercent}% confidence)`);
    });
  } else {
    lines.push('No active forecasts.');
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');

  // Recommendations
  lines.push('## 💡 Recommendations');
  lines.push('');
  
  if (snapshot.focusedFile) {
    lines.push(`- Resume editing **${snapshot.focusedFile}** to continue the current reasoning path.`);
    lines.push('- Check recent patterns for alignment with this file.');
  } else {
    lines.push('- No active file. Try reopening your last context or reviewing pending forecasts.');
  }
  
  if (snapshot.patterns && snapshot.patterns.length > 0) {
    const highConfidencePatterns = snapshot.patterns.filter(p => p.confidence > 0.7);
    if (highConfidencePatterns.length > 0) {
      lines.push(`- ${highConfidencePatterns.length} high-confidence pattern(s) detected — leverage these insights.`);
    }
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('_Automatically generated by RL4 Cognitive Replay_');

  return lines.join('\n');
}

/**
 * Export snapshot data as JSON (for programmatic access and WebView)
 * Returns clean CognitiveSnapshot compatible with useRL4Store()
 */
export async function generateSnapshotJSON(root?: string): Promise<CognitiveSnapshot> {
  const rl4Root = root || path.join(process.cwd(), '.reasoning_rl4');
  
  const snapshot: CognitiveSnapshot = {
    cycleId: 0,
    timestamp: new Date().toISOString(),
  };

  // 1. Load current cycle
  try {
    const cyclesPath = path.join(rl4Root, 'ledger', 'cycles.jsonl');
    if (fs.existsSync(cyclesPath)) {
      const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const latestCycle = JSON.parse(lines[lines.length - 1]);
        snapshot.cycleId = latestCycle.cycleId || 0;
        snapshot.timestamp = latestCycle.timestamp || snapshot.timestamp;
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 2. Load IDE activity (focused file, recently viewed)
  try {
    const ideActivityPath = path.join(rl4Root, 'traces', 'ide_activity.jsonl');
    if (fs.existsSync(ideActivityPath)) {
      const lines = fs.readFileSync(ideActivityPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const latestActivity = JSON.parse(lines[lines.length - 1]);
        const metadata = latestActivity.metadata || {};
        
        if (metadata.focused_file?.path) {
          snapshot.focusedFile = metadata.focused_file.path;
        }
        
        if (Array.isArray(metadata.recently_viewed)) {
          snapshot.recentlyViewed = metadata.recently_viewed
            .slice(0, 5)
            .map((item: any) => typeof item === 'string' ? item : item.path)
            .filter(Boolean);
        }
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 3. Load active patterns
  try {
    const patternsPath = path.join(rl4Root, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
      if (Array.isArray(patternsData.patterns)) {
        snapshot.patterns = patternsData.patterns
          .slice(-5) // Last 5 patterns
          .map((p: any) => ({
            id: p.pattern_id || p.id || 'unknown',
            confidence: p.confidence || 0,
            trend: p.trend || 'stable',
          }));
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 4. Load active forecasts
  try {
    const forecastsPath = path.join(rl4Root, 'forecasts.json');
    if (fs.existsSync(forecastsPath)) {
      const forecastsData = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
      // Handle both array format [...] and object format {forecasts: [...]}
      const forecastsArray = Array.isArray(forecastsData) ? forecastsData : (forecastsData.forecasts || []);
      
      if (forecastsArray.length > 0) {
        snapshot.forecasts = forecastsArray
          .slice(-5) // Last 5 forecasts
          .map((f: any) => ({
            predicted: f.predicted_decision || f.predicted || f.description || 'Unknown',
            confidence: f.confidence || 0,
          }));
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 5. Load mental state (if available)
  try {
    const mentalStatePath = path.join(rl4Root, 'mental_state.json');
    if (fs.existsSync(mentalStatePath)) {
      const mentalState = JSON.parse(fs.readFileSync(mentalStatePath, 'utf-8'));
      snapshot.mood = mentalState.mood || undefined;
      snapshot.confidence = mentalState.confidence || undefined;
    }
  } catch (error) {
    // Silent fail
  }

  return snapshot;
}

/**
 * Generate complete cognitive state for WebView UI
 * Aggregates all RL4 data sources into a single structured object
 */
export async function generateCognitiveState(root?: string): Promise<any> {
  const rl4Root = root || path.join(process.cwd(), '.reasoning_rl4');
  
  const state: any = {
    timestamp: new Date().toISOString(),
    cycleId: 0,
    adrs: { total: 0, recent: [] },
    patterns: { total: 0, impacts: {}, recent: [] },
    correlations: { total: 0, directions: {}, recent: [] },
    forecasts: { total: 0, recent: [] },
    biases: { total: 0, types: {}, recent: [] },
    goals: { active: 0, completed: 0, list: [] },
    focus: null,
    recentlyViewed: [],
  };

  // 1. Load current cycle
  try {
    const cyclesPath = path.join(rl4Root, 'ledger', 'cycles.jsonl');
    if (fs.existsSync(cyclesPath)) {
      const lines = fs.readFileSync(cyclesPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const latestCycle = JSON.parse(lines[lines.length - 1]);
        state.cycleId = latestCycle.cycleId || 0;
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 2. Load patterns
  try {
    const patternsPath = path.join(rl4Root, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      const patternsData = JSON.parse(fs.readFileSync(patternsPath, 'utf-8'));
      if (Array.isArray(patternsData.patterns)) {
        state.patterns.total = patternsData.patterns.length;
        state.patterns.recent = patternsData.patterns.slice(-5); // Last 5
        
        // Count by impact
        patternsData.patterns.forEach((p: any) => {
          const impact = p.impact || 'unknown';
          state.patterns.impacts[impact] = (state.patterns.impacts[impact] || 0) + 1;
        });
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 3. Load forecasts
  try {
    const forecastsPath = path.join(rl4Root, 'forecasts.json');
    if (fs.existsSync(forecastsPath)) {
      const forecastsData = JSON.parse(fs.readFileSync(forecastsPath, 'utf-8'));
      if (Array.isArray(forecastsData.forecasts)) {
        state.forecasts.total = forecastsData.forecasts.length;
        state.forecasts.recent = forecastsData.forecasts.slice(-5); // Last 5
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 4. Load correlations
  try {
    const correlationsPath = path.join(rl4Root, 'correlations.json');
    if (fs.existsSync(correlationsPath)) {
      const correlationsData = JSON.parse(fs.readFileSync(correlationsPath, 'utf-8'));
      if (Array.isArray(correlationsData.correlations)) {
        state.correlations.total = correlationsData.correlations.length;
        state.correlations.recent = correlationsData.correlations.slice(-5); // Last 5
        
        // Count by direction
        correlationsData.correlations.forEach((c: any) => {
          const direction = c.direction || 'unknown';
          state.correlations.directions[direction] = (state.correlations.directions[direction] || 0) + 1;
        });
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 5. Load goals
  try {
    const goalsPath = path.join(rl4Root, 'goals.json');
    if (fs.existsSync(goalsPath)) {
      const goalsData = JSON.parse(fs.readFileSync(goalsPath, 'utf-8'));
      if (Array.isArray(goalsData.goals)) {
        state.goals.list = goalsData.goals;
        state.goals.active = goalsData.goals.filter((g: any) => g.status === 'active' || g.status === 'in_progress').length;
        state.goals.completed = goalsData.goals.filter((g: any) => g.status === 'completed').length;
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 6. Load ADRs count (from ledger or directory scan)
  try {
    const adrLedgerPath = path.join(rl4Root, 'ledger', 'adrs.jsonl');
    if (fs.existsSync(adrLedgerPath)) {
      const lines = fs.readFileSync(adrLedgerPath, 'utf-8').trim().split('\n').filter(Boolean);
      state.adrs.total = lines.length;
      state.adrs.recent = lines.slice(-5).map(line => JSON.parse(line));
    }
  } catch (error) {
    // Silent fail
  }

  // 7. Load IDE activity (focused file, recently viewed)
  try {
    const ideActivityPath = path.join(rl4Root, 'traces', 'ide_activity.jsonl');
    if (fs.existsSync(ideActivityPath)) {
      const lines = fs.readFileSync(ideActivityPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const latestActivity = JSON.parse(lines[lines.length - 1]);
        const metadata = latestActivity.metadata || {};
        
        if (metadata.focused_file?.path) {
          state.focus = metadata.focused_file.path;
        }
        
        if (Array.isArray(metadata.recently_viewed)) {
          state.recentlyViewed = metadata.recently_viewed
            .slice(0, 5)
            .map((item: any) => typeof item === 'string' ? item : item.path)
            .filter(Boolean);
        }
      }
    }
  } catch (error) {
    // Silent fail
  }

  // 8. Load biases (if available)
  try {
    const biasesPath = path.join(rl4Root, 'biases.json');
    if (fs.existsSync(biasesPath)) {
      const biasesData = JSON.parse(fs.readFileSync(biasesPath, 'utf-8'));
      if (Array.isArray(biasesData.biases)) {
        state.biases.total = biasesData.biases.length;
        state.biases.recent = biasesData.biases.slice(-5); // Last 5
        
        // Count by type
        biasesData.biases.forEach((b: any) => {
          const type = b.type || 'unknown';
          state.biases.types[type] = (state.biases.types[type] || 0) + 1;
        });
      }
    }
  } catch (error) {
    // Silent fail
  }

  return state;
}

