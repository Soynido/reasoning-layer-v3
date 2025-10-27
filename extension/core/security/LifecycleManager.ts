/**
 * LifecycleManager - Level 5: Lifecycle & Retention Policy
 * 
 * Manages ADR/Evidence lifecycle and retention policies
 */

import * as fs from 'fs';
import * as path from 'path';

export type LifecycleStatus = 'active' | 'archived' | 'deprecated' | 'deleted';

export interface RetentionPolicy {
    defaultRetentionDays: number;
    archivalDirectory: string;
    permanentArtefacts: string[]; // IDs that should never be archived
}

export interface LifecycleMetadata {
    artifactId: string;
    artifactType: 'ADR' | 'EVIDENCE' | 'SNAPSHOT';
    lifecycleStatus: LifecycleStatus;
    createdAt: string;
    lastModified: string;
    archivedAt?: string;
    retentionDays: number;
}

export class LifecycleManager {
    private workspaceRoot: string;
    private policyPath: string;
    private lifecyclePath: string;
    private policy!: RetentionPolicy;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.policyPath = path.join(workspaceRoot, '.reasoning', 'manifest.policy.json');
        this.lifecyclePath = path.join(workspaceRoot, '.reasoning', 'lifecycle');
        
        // Ensure lifecycle directory exists
        if (!fs.existsSync(this.lifecyclePath)) {
            fs.mkdirSync(this.lifecyclePath, { recursive: true });
        }
        
        // Load or create policy
        this.loadOrCreatePolicy();
    }

    /**
     * Load existing policy or create default
     */
    private loadOrCreatePolicy(): void {
        if (fs.existsSync(this.policyPath)) {
            this.policy = JSON.parse(fs.readFileSync(this.policyPath, 'utf-8'));
        } else {
            this.policy = {
                defaultRetentionDays: 365,
                archivalDirectory: path.join(this.workspaceRoot, '.reasoning', 'archive'),
                permanentArtefacts: []
            };
            fs.writeFileSync(this.policyPath, JSON.stringify(this.policy, null, 2));
        }
    }

    /**
     * Get or create lifecycle metadata for an artifact
     */
    public getLifecycleMetadata(artifactId: string, artifactType: 'ADR' | 'EVIDENCE' | 'SNAPSHOT'): LifecycleMetadata {
        const metadataPath = path.join(this.lifecyclePath, `${artifactId}.json`);
        
        if (fs.existsSync(metadataPath)) {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        }
        
        // Create new metadata
        const now = new Date().toISOString();
        const metadata: LifecycleMetadata = {
            artifactId,
            artifactType,
            lifecycleStatus: 'active',
            createdAt: now,
            lastModified: now,
            retentionDays: this.policy.defaultRetentionDays
        };
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        return metadata;
    }

    /**
     * Update lifecycle status
     */
    public updateLifecycleStatus(
        artifactId: string,
        status: LifecycleStatus,
        retentionDays?: number
    ): void {
        const metadataPath = path.join(this.lifecyclePath, `${artifactId}.json`);
        
        let metadata: LifecycleMetadata;
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        } else {
            metadata = this.getLifecycleMetadata(artifactId, 'ADR');
        }
        
        metadata.lifecycleStatus = status;
        metadata.lastModified = new Date().toISOString();
        
        if (retentionDays !== undefined) {
            metadata.retentionDays = retentionDays;
        }
        
        if (status === 'archived') {
            metadata.archivedAt = new Date().toISOString();
        }
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    /**
     * Check if artifact should be archived based on retention policy
     */
    public shouldArchive(artifactId: string): boolean {
        if (this.policy.permanentArtefacts.includes(artifactId)) {
            return false;
        }
        
        const metadata = this.getLifecycleMetadata(artifactId, 'ADR');
        
        if (metadata.lifecycleStatus !== 'active') {
            return false;
        }
        
        const createdDate = new Date(metadata.createdAt);
        const retentionDays = metadata.retentionDays;
        const now = new Date();
        const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        
        return daysSinceCreation > retentionDays;
    }

    /**
     * Archive expired artifacts
     */
    public archiveExpiredArtifacts(): { archived: string[]; errors: string[] } {
        const archived: string[] = [];
        const errors: string[] = [];
        
        if (!fs.existsSync(this.lifecyclePath)) {
            return { archived, errors };
        }
        
        const files = fs.readdirSync(this.lifecyclePath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            const artifactId = file.replace('.json', '');
            
            try {
                if (this.shouldArchive(artifactId)) {
                    this.updateLifecycleStatus(artifactId, 'archived');
                    archived.push(artifactId);
                }
            } catch (error) {
                errors.push(`Failed to archive ${artifactId}: ${error}`);
            }
        }
        
        return { archived, errors };
    }

    /**
     * Get retention policy
     */
    public getRetentionPolicy(): RetentionPolicy {
        return { ...this.policy };
    }

    /**
     * Update retention policy
     */
    public updateRetentionPolicy(policy: Partial<RetentionPolicy>): void {
        this.policy = { ...this.policy, ...policy };
        fs.writeFileSync(this.policyPath, JSON.stringify(this.policy, null, 2));
    }
}

