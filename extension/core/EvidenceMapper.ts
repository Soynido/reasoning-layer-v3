import { CaptureEvent, Evidence, DependencyInfo, TestReport, ConfigValue } from './types';

/**
 * EvidenceMapper - Data Contract Interface entre Capture et RBOM
 * 
 * Chaque événement capturé devient un "Evidence" node utilisable par le RBOM Engine
 * pour lier des preuves à des Architectural Decision Records (ADRs).
 */
export class EvidenceMapper {
    /**
     * Convertit un CaptureEvent en Evidence node
     */
    public mapToEvidence(event: CaptureEvent): Evidence {
        switch (event.type) {
            case 'git_commit':
                return this.mapCommitToEvidence(event);
            
            case 'file_change':
                return this.mapFileChangeToEvidence(event);
            
            case 'git_branch':
                return this.mapBranchToEvidence(event);
            
            case 'dependencies':
                return this.mapDependenciesToEvidence(event);
            
            case 'config':
                return this.mapConfigToEvidence(event);
            
            case 'test':
                return this.mapTestToEvidence(event);
            
            default:
                return this.mapDefaultToEvidence(event);
        }
    }

    private mapCommitToEvidence(event: CaptureEvent): Evidence {
        return {
            id: event.id,
            type: 'commit',
            source: event.source,
            timestamp: event.timestamp,
            metadata: {
                ...event.metadata,
                level: '1 - Code & Structure Technique',
                category: 'Git Metadata'
            },
            version: '1.0'
        };
    }

    private mapFileChangeToEvidence(event: CaptureEvent): Evidence {
        return {
            id: event.id,
            type: 'file_change',
            source: event.source,
            timestamp: event.timestamp,
            metadata: {
                ...event.metadata,
                level: '1 - Code & Structure Technique',
                category: 'File Changes'
            },
            version: '1.0'
        };
    }

    private mapBranchToEvidence(event: CaptureEvent): Evidence {
        return {
            id: event.id,
            type: 'git_branch',
            source: event.source,
            timestamp: event.timestamp,
            metadata: {
                ...event.metadata,
                level: '1 - Code & Structure Technique',
                category: 'Git Metadata'
            },
            version: '1.0'
        };
    }

    private mapDependenciesToEvidence(event: CaptureEvent): Evidence {
        const dependencies = event.metadata.dependencies as DependencyInfo[] | undefined;
        
        return {
            id: event.id,
            type: 'dependency',
            source: event.source,
            timestamp: event.timestamp,
            metadata: {
                level: '1 - Code & Structure Technique',
                category: 'Dependencies',
                dependencies: dependencies || [],
                total: event.metadata.total || 0
            },
            version: '1.0'
        };
    }

    private mapConfigToEvidence(event: CaptureEvent): Evidence {
        return {
            id: event.id,
            type: 'config',
            source: event.source,
            timestamp: event.timestamp,
            metadata: {
                level: '1 - Code & Structure Technique',
                category: 'Configuration',
                fileType: event.metadata.fileType,
                keys: event.metadata.keys || {}
            },
            version: '1.0'
        };
    }

    private mapTestToEvidence(event: CaptureEvent): Evidence {
        return {
            id: event.id,
            type: 'test',
            source: event.source,
            timestamp: event.timestamp,
            metadata: {
                level: '1 - Code & Structure Technique',
                category: 'Test Reports',
                framework: event.metadata.framework,
                status: event.metadata.status,
                totalTests: event.metadata.totalTests || 0,
                passed: event.metadata.passed || 0,
                failed: event.metadata.failed || 0,
                coverage: event.metadata.coverage
            },
            version: '1.0'
        };
    }

    private mapDefaultToEvidence(event: CaptureEvent): Evidence {
        return {
            id: event.id,
            type: 'file_change',
            source: event.source,
            timestamp: event.timestamp,
            metadata: event.metadata,
            version: '1.0'
        };
    }

    /**
     * Convertit une liste de CaptureEvents en Evidence nodes
     */
    public mapEventsToEvidence(events: CaptureEvent[]): Evidence[] {
        return events.map(event => this.mapToEvidence(event));
    }

    /**
     * Filtre les Evidence nodes par type
     */
    public filterByType(evidenceList: Evidence[], type: Evidence['type']): Evidence[] {
        return evidenceList.filter(evidence => evidence.type === type);
    }

    /**
     * Trouve des Evidence nodes liés à un fichier spécifique
     */
    public findEvidenceForFile(evidenceList: Evidence[], filePath: string): Evidence[] {
        return evidenceList.filter(evidence => evidence.source.includes(filePath));
    }

    /**
     * Trouve des Evidence nodes dans un intervalle de temps
     */
    public findEvidenceInTimeRange(
        evidenceList: Evidence[], 
        startTime: string, 
        endTime: string
    ): Evidence[] {
        return evidenceList.filter(evidence => {
            const timestamp = new Date(evidence.timestamp).getTime();
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            return timestamp >= start && timestamp <= end;
        });
    }
}

