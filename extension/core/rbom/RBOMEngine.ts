import * as fs from 'fs';
import * as path from 'path';
// ❌ Import uuid différé pour éviter le top-level load
// import { v4 as uuidv4 } from 'uuid';
import { ADR, ADRSearchFilter } from './types';

/**
 * RBOMEngine - Gestion des ADRs (Architectural Decision Records)
 * 
 * Opérations CRUD de base pour les ADRs avec validation non-bloquante
 */
export class RBOMEngine {
    private adrsDir: string;
    private adrsIndexPath: string;
    private adrs: Map<string, ADR> = new Map();
    private validatorModule: any = null;
    private uuidModule: any = null; // Chargé dynamiquement
    private log: ((msg: string) => void) | null = null;
    private warn: ((msg: string) => void) | null = null;

    constructor(workspaceRoot: string, logFn?: (msg: string) => void, warnFn?: (msg: string) => void) {
        this.adrsDir = path.join(workspaceRoot, '.reasoning', 'adrs');
        this.adrsIndexPath = path.join(this.adrsDir, 'index.json');
        this.log = logFn || null;
        this.warn = warnFn || null;
        
        // Créer le dossier si nécessaire
        if (!fs.existsSync(this.adrsDir)) {
            fs.mkdirSync(this.adrsDir, { recursive: true });
        }
        
        // Charger les ADRs existants de manière sûre
        this.loadIndex();
    }
    
    /**
     * Démarre le chargement du validator (fire-and-forget, jamais bloquant)
     */
    public warmupValidation(): void {
        // Charger UUID ET validator de manière asynchrone
        // Ne jamais await - start async load but don't block
        void Promise.all([
            this.loadUuidModule().catch((err: any) => {
                if (this.warn) this.warn(`UUID module load failed: ${String(err)}`);
            }),
            this.loadValidatorModule().catch((err) => {
                if (this.warn) {
                    this.warn(`RBOMEngine deferred validation disabled: ${String(err)}`);
                }
            })
        ]).catch(() => {
            // Ignore errors
        });
    }
    
    /**
     * Charge le module uuid de manière asynchrone
     */
    private async loadUuidModule(): Promise<void> {
        if (this.uuidModule) return; // Already loaded
        try {
            this.uuidModule = await import('uuid');
            if (this.log) {
                this.log('✅ UUID module loaded');
            }
        } catch (e) {
            if (this.warn) {
                this.warn(`Failed to load UUID: ${String(e)}`);
            }
            throw e;
        }
    }
    
    /**
     * Helper pour générer un UUID (utilise le module chargé ou fallback)
     */
    private generateId(): string {
        if (this.uuidModule) {
            return this.uuidModule.v4();
        }
        // Fallback: timestamp + random (pas d'UUID standard mais évite le crash)
        return `adr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Charge le module schema de manière asynchrone (jamais bloquant)
     */
    private async loadValidatorModule(): Promise<void> {
        if (this.log) {
            this.log('⏳ Loading SchemaManager...');
        }
        
        try {
            // webpackMode: eager = même fichier, pas de chunk séparé
            const mod = await import(/* webpackMode: "eager" */ './schema');
            this.validatorModule = mod;
            if (this.log) {
                this.log('✅ RBOMEngine loaded with Zod validation');
            }
        } catch (e: any) {
            if (this.warn) {
                this.warn(`❌ RBOMEngine could not load schema: ${e?.message ?? e}`);
            }
            // Garde le validateur basique
        }
    }

    /**
     * Valide un ADR avec fallback (jamais de throw)
     */
    private validateADRInternal(adr: any): { valid: boolean; errors: string[] } {
        // Si Zod est chargé, utilise-le
        if (this.validatorModule) {
            try {
                const result = this.validatorModule.validateADR(adr);
                if (result) {
                    return { valid: true, errors: [] };
                }
                return { valid: false, errors: ['Validation returned null'] };
            } catch (e: any) {
                return { valid: false, errors: [e?.message ?? 'Unknown validation error'] };
            }
        }
        
        // Fallback: validation basique (toujours disponible)
        return this.basicValidateADR(adr);
    }

    /**
     * Validateur basique de fallback (jamais de throw, toujours fonctionnel)
     */
    private basicValidateADR(adr: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (!adr?.title?.trim()) errors.push('title is required');
        if (!adr?.context?.trim()) errors.push('context is required');
        if (!adr?.decision?.trim()) errors.push('decision is required');
        if (!adr?.consequences?.trim()) errors.push('consequences is required');
        
        return errors.length ? { valid: false, errors } : { valid: true, errors: [] };
    }

    /**
     * Créer un nouvel ADR
     */
    public createADR(data: Partial<ADR>): ADR | null {
        try {
            const now = new Date().toISOString();
            const adr: ADR = {
                id: this.generateId(),
                title: data.title || 'Untitled ADR',
                status: data.status || 'proposed',
                createdAt: now,
                modifiedAt: now,
                author: data.author || 'unknown',
                context: data.context || '',
                decision: data.decision || '',
                consequences: data.consequences || '',
                tags: data.tags || [],
                components: data.components || [],
                relatedADRs: data.relatedADRs || [],
                evidenceIds: data.evidenceIds || [],
                lastSyncedAt: data.lastSyncedAt,
                autoGenerated: data.autoGenerated || false
            };

            // Validation (jamais bloquante)
            const validation = this.validateADRInternal(adr);
            if (!validation.valid) {
                if (this.warn) {
                    this.warn(`ADR validation failed: ${validation.errors?.join(', ')}`);
                }
                return null;
            }

            // Sauvegarder
            this.saveADR(adr);
            this.adrs.set(adr.id, adr);
            this.saveIndex();

            return adr;
        } catch (error) {
            if (this.warn) {
                this.warn(`Failed to create ADR: ${error}`);
            }
            return null;
        }
    }

    /**
     * Lire un ADR par ID
     */
    public getADR(id: string): ADR | null {
        if (this.adrs.has(id)) {
            return this.adrs.get(id) || null;
        }

        // Charger depuis le fichier si non dans le cache
        const filePath = path.join(this.adrsDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const adr = JSON.parse(content) as ADR;
                this.adrs.set(adr.id, adr);
                return adr;
            } catch (error) {
                if (this.warn) {
                    this.warn(`Failed to load ADR ${id}: ${error}`);
                }
            }
        }

        return null;
    }

    /**
     * Mettre à jour un ADR
     */
    public updateADR(id: string, updates: Partial<ADR>): ADR | null {
        const adr = this.getADR(id);
        if (!adr) {
            if (this.warn) {
                this.warn(`ADR not found: ${id}`);
            }
            return null;
        }

        const updated: ADR = {
            ...adr,
            ...updates,
            id: adr.id, // ID ne peut pas être modifié
            createdAt: adr.createdAt, // createdAt ne peut pas être modifié
            modifiedAt: new Date().toISOString()
        };

        // Validation (jamais bloquante)
        const validation = this.validateADRInternal(updated);
        if (!validation.valid) {
            if (this.warn) {
                this.warn(`ADR validation failed: ${validation.errors?.join(', ')}`);
            }
            return null;
        }

        // Sauvegarder
        this.saveADR(updated);
        this.adrs.set(id, updated);
        this.saveIndex();

        return updated;
    }

    /**
     * Supprimer un ADR
     */
    public deleteADR(id: string): boolean {
        const filePath = path.join(this.adrsDir, `${id}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                this.adrs.delete(id);
                this.saveIndex();
                return true;
            } catch (error) {
                if (this.warn) {
                    this.warn(`Failed to delete ADR ${id}: ${error}`);
                }
                return false;
            }
        }

        return false;
    }

    /**
     * Lister tous les ADRs
     */
    public listADRs(filter?: ADRSearchFilter): ADR[] {
        const adrs = Array.from(this.adrs.values());

        if (!filter) {
            return adrs;
        }

        // Appliquer les filtres
        return adrs.filter(adr => {
            if (filter.status && adr.status !== filter.status) {
                return false;
            }

            if (filter.tags && filter.tags.length > 0) {
                const hasTag = filter.tags.some(tag => adr.tags.includes(tag));
                if (!hasTag) {
                    return false;
                }
            }

            if (filter.components && filter.components.length > 0) {
                const hasComponent = filter.components.some(comp => adr.components.includes(comp));
                if (!hasComponent) {
                    return false;
                }
            }

            if (filter.author && adr.author !== filter.author) {
                return false;
            }

            return true;
        });
    }

    /**
     * Lier un Evidence à un ADR
     */
    public linkEvidence(adrId: string, evidenceId: string): boolean {
        const adr = this.getADR(adrId);
        if (!adr) {
            return false;
        }

        if (!adr.evidenceIds.includes(evidenceId)) {
            adr.evidenceIds.push(evidenceId);
            this.saveADR(adr);
            this.saveIndex();
        }

        return true;
    }

    /**
     * Délier un Evidence d'un ADR
     */
    public unlinkEvidence(adrId: string, evidenceId: string): boolean {
        const adr = this.getADR(adrId);
        if (!adr) {
            return false;
        }

        const index = adr.evidenceIds.indexOf(evidenceId);
        if (index > -1) {
            adr.evidenceIds.splice(index, 1);
            this.saveADR(adr);
            this.saveIndex();
        }

        return true;
    }

    // Private methods

    private saveADR(adr: ADR): void {
        try {
            const filePath = path.join(this.adrsDir, `${adr.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(adr, null, 2), 'utf-8');
        } catch (error) {
            if (this.warn) {
                this.warn(`Failed to save ADR: ${error}`);
            }
        }
    }

    private loadIndex(): void {
        try {
            if (!fs.existsSync(this.adrsIndexPath)) {
                return; // Index n'existe pas encore
            }
            
            const content = fs.readFileSync(this.adrsIndexPath, 'utf-8');
            const data = JSON.parse(content);
            
            if (data.adrIds && Array.isArray(data.adrIds)) {
                // Charger les IDs mais pas les données complètes
                data.adrIds.forEach((id: string) => {
                    const filePath = path.join(this.adrsDir, `${id}.json`);
                    if (fs.existsSync(filePath)) {
                        try {
                            const adrContent = fs.readFileSync(filePath, 'utf-8');
                            const adr = JSON.parse(adrContent);
                            this.adrs.set(id, adr);
                        } catch (error) {
                            if (this.warn) {
                                this.warn(`Failed to load ADR ${id}: ${error}`);
                            }
                        }
                    }
                });
            }
        } catch (error) {
            if (this.warn) {
                this.warn(`Failed to load ADR index: ${error}`);
            }
        }
    }

    private saveIndex(): void {
        try {
            const adrIds = Array.from(this.adrs.keys());
            const data = { adrIds, lastUpdated: new Date().toISOString() };
            fs.writeFileSync(this.adrsIndexPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            if (this.warn) {
                this.warn(`Failed to save ADR index: ${error}`);
            }
        }
    }
}
