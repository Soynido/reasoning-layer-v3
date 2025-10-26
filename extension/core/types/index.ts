// ✅ COPIÉ V2 - Types stables
export interface CaptureEvent {
    id: string;              // UUID
    timestamp: string;       // ISO 8601
    type: 'file_change' | 'git_commit' | 'git_branch';
    source: string;          // Chemin fichier ou commit hash
    metadata: Record<string, any>;
}

export interface ProjectManifest {
    version: '1.0';
    projectName: string;
    createdAt: string;
    lastCaptureAt: string;
    totalEvents: number;
}

export interface SerializableData {
    events: CaptureEvent[];
    manifest: ProjectManifest;
}
