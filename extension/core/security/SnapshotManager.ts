/**
 * SnapshotManager - Level 5: Snapshot Manifest Generation
 * 
 * Generates snapshot manifests for the cognitive reasoning graph
 */

import * as fs from 'fs';
import * as path from 'path';
import { IntegrityEngine, SignedArtifact } from './IntegrityEngine';
import { ADR } from '../rbom/types';

export interface SnapshotManifest {
    snapshot_id: string;
    snapshot_version: string;
    created_at: string;
    adr_count: number;
    evidence_count: number;
    hash_chain: string[];
    project_manifest?: {
        total_events: number;
        version: string;
        created: string;
    };
    lifecycle_metadata?: {
        active_count: number;
        archived_count: number;
        deprecated_count: number;
    };
}

export class SnapshotManager {
    private workspaceRoot: string;
    private snapshotPath: string;
    private integrityEngine: IntegrityEngine;

    constructor(workspaceRoot: string, integrityEngine: IntegrityEngine) {
        this.workspaceRoot = workspaceRoot;
        this.snapshotPath = path.join(workspaceRoot, '.reasoning', 'snapshots');
        
        if (!fs.existsSync(this.snapshotPath)) {
            fs.mkdirSync(this.snapshotPath, { recursive: true });
        }
        
        this.integrityEngine = integrityEngine;
    }

    /**
     * Generate snapshot manifest from current state
     */
    public async generateSnapshot(adrs: ADR[], allEvents: any[]): Promise<SnapshotManifest> {
        const snapshotId = `SNAP-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        
        // Get project manifest if exists
        let projectManifest: any = null;
        const manifestPath = path.join(this.workspaceRoot, '.reasoning', 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            projectManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        }
        
        // Generate hash chain for all ADRs
        const hashChain = adrs.map(adr => {
            const dataString = JSON.stringify(adr);
            return this.integrityEngine.generateHash(dataString).hash;
        });
        
        // Count lifecycle states
        const lifecycleMetadata = this.getLifecycleMetadata(adrs);
        
        const snapshot: SnapshotManifest = {
            snapshot_id: snapshotId,
            snapshot_version: '1.0',
            created_at: new Date().toISOString(),
            adr_count: adrs.length,
            evidence_count: allEvents.length,
            hash_chain: hashChain,
            project_manifest: projectManifest ? {
                total_events: projectManifest.totalEvents || 0,
                version: projectManifest.version || '1.0',
                created: projectManifest.created || ''
            } : undefined,
            lifecycle_metadata: lifecycleMetadata
        };
        
        // Sign and save snapshot
        const signedSnapshot = this.integrityEngine.signArtifact(
            snapshotId,
            'SNAPSHOT',
            snapshot
        );
        
        const snapshotFile = path.join(this.snapshotPath, `${snapshotId}.json`);
        fs.writeFileSync(snapshotFile, JSON.stringify(signedSnapshot, null, 2));
        
        // Append to ledger
        this.integrityEngine.appendToLedger({
            type: 'SNAPSHOT',
            target_id: snapshotId,
            current_hash: signedSnapshot.hash.hash,
            signature: signedSnapshot.signature?.signature
        });
        
        return snapshot;
    }

    /**
     * Get lifecycle metadata for ADRs
     */
    private getLifecycleMetadata(adrs: ADR[]): { active_count: number; archived_count: number; deprecated_count: number } {
        const lifecyclePath = path.join(this.workspaceRoot, '.reasoning', 'lifecycle');
        
        if (!fs.existsSync(lifecyclePath)) {
            return { active_count: adrs.length, archived_count: 0, deprecated_count: 0 };
        }
        
        let activeCount = 0;
        let archivedCount = 0;
        let deprecatedCount = 0;
        
        for (const adr of adrs) {
            const metadataPath = path.join(lifecyclePath, `${adr.id}.json`);
            
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                if (metadata.lifecycleStatus === 'archived') archivedCount++;
                else if (metadata.lifecycleStatus === 'deprecated') deprecatedCount++;
                else activeCount++;
            } else {
                activeCount++;
            }
        }
        
        return { active_count: activeCount, archived_count: archivedCount, deprecated_count: deprecatedCount };
    }

    /**
     * List all snapshots
     */
    public listSnapshots(): SnapshotManifest[] {
        if (!fs.existsSync(this.snapshotPath)) {
            return [];
        }
        
        const files = fs.readdirSync(this.snapshotPath).filter(f => f.endsWith('.json'));
        const snapshots: SnapshotManifest[] = [];
        
        for (const file of files) {
            try {
                const signedSnapshot = JSON.parse(fs.readFileSync(path.join(this.snapshotPath, file), 'utf-8')) as SignedArtifact;
                if (signedSnapshot.data) {
                    snapshots.push(signedSnapshot.data as SnapshotManifest);
                }
            } catch (error) {
                // Skip corrupted files
            }
        }
        
        return snapshots.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    /**
     * Get latest snapshot
     */
    public getLatestSnapshot(): SnapshotManifest | null {
        const snapshots = this.listSnapshots();
        return snapshots.length > 0 ? snapshots[0] : null;
    }

    /**
     * Compare two snapshots
     */
    public compareSnapshots(snap1: SnapshotManifest, snap2: SnapshotManifest): {
        adrs_added: number;
        adrs_removed: number;
        evidence_added: number;
        evidence_removed: number;
    } {
        return {
            adrs_added: snap2.adr_count - snap1.adr_count,
            adrs_removed: snap1.adr_count - snap2.adr_count,
            evidence_added: snap2.evidence_count - snap1.evidence_count,
            evidence_removed: snap1.evidence_count - snap2.evidence_count
        };
    }
}

