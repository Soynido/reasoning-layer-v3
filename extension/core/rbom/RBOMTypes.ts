import { z } from 'zod';

/**
 * COMPLETE RBOM 7-LEVEL SPECIFICATION
 * 70+ data types across 7 context levels
 * Revolutionary organizational memory system
 */

// =============================================================================
// LEVEL 1: CODE & STRUCTURE TECHNIQUE (10 types)
// =============================================================================

export const CommitDataSchema = z.object({
  hash: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
    date: z.string()
  }),
  message: z.string(),
  timestamp: z.string(),
  filesChanged: z.number(),
  branch: z.string().optional()
});

export const DiffSummarySchema = z.object({
  insertions: z.number(),
  deletions: z.number(),
  files: z.array(z.object({
    path: z.string(),
    insertions: z.number(),
    deletions: z.number(),
    binary: z.boolean().optional()
  })),
  functionsImpacted: z.array(z.string()).optional(),
  dependenciesModified: z.array(z.string()).optional()
});

export const DependencySchema = z.object({
  name: z.string(),
  version: z.string(),
  license: z.string().optional(),
  origin: z.string(), // npm, pip, cargo, etc.
  hash: z.string().optional(),
  type: z.enum(['runtime', 'dev', 'peer', 'optional']),
  integrity: z.string().optional()
});

export const BuildMetadataSchema = z.object({
  buildId: z.string(),
  environment: z.enum(['dev', 'staging', 'prod', 'test']),
  artifacts: z.array(z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    hash: z.string()
  })),
  timestamp: z.string(),
  triggeredBy: z.string().optional()
});

export const LinkedTestSchema = z.object({
  name: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'pending']),
  file: z.string(),
  coverage: z.number().optional(),
  duration: z.number().optional(),
  assertionCount: z.number().optional(),
  linkedToDecision: z.string().optional()
});

export const BenchmarkMetricSchema = z.object({
  name: z.string(),
  category: z.enum(['latency', 'cpu', 'memory', 'throughput', 'custom']),
  metrics: z.record(z.string(), z.number()),
  baseline: z.number().optional(),
  improvement: z.number().optional(),
  timestamp: z.string(),
  environment: z.string()
});

export const ConfigFileSchema = z.object({
  path: z.string(),
  type: z.enum(['yaml', 'toml', 'json', 'xml', 'ini', 'env']),
  criticalValues: z.array(z.object({
    key: z.string(),
    value: z.any(),
    isSensitive: z.boolean(),
    category: z.string().optional()
  })),
  lastModified: z.string(),
  version: z.string().optional()
});

export const ArchitectureMapSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['module', 'library', 'layer', 'service', 'component']),
    path: z.string(),
    dependencies: z.array(z.string()),
    size: z.number().optional(),
    complexity: z.number().optional()
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(['imports', 'calls', 'extends', 'implements', 'depends']),
    strength: z.number().optional()
  }))
});

export const CodeOwnerSchema = z.object({
  path: z.string(),
  owners: z.array(z.object({
    name: z.string(),
    email: z.string(),
    role: z.enum(['maintainer', 'reviewer', 'approver', 'contributor']),
    confidence: z.number().optional()
  })),
  lastModified: z.string(),
  modifiedBy: z.string().optional()
});

export const LineLevelLinkSchema = z.object({
  file: z.string(),
  line: z.number(),
  decisionId: z.string(),
  commitHash: z.string(),
  anchorHash: z.string(),
  justification: z.string().optional()
});

// =============================================================================
// LEVEL 2: DÉCISIONS TECHNIQUES (12 types)
// =============================================================================

export const ArchitecturalDecisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['proposed', 'accepted', 'deprecated', 'superseded', 'rejected']),
  dateCreated: z.string(),
  context: z.string(),
  problem: z.string(),
  options: z.array(z.string()),
  decision: z.string(),
  consequences: z.string(),
  components: z.array(z.string()),
  tags: z.array(z.string()),
  confidence: z.number().optional()
});

export const TradeoffAnalysisSchema = z.object({
  decisionId: z.string(),
  options: z.array(z.object({
    name: z.string(),
    advantages: z.array(z.string()),
    disadvantages: z.array(z.string()),
    score: z.number().optional()
  })),
  criteria: z.array(z.string()),
  weights: z.record(z.string(), z.number()).optional(),
  selectedOption: z.string()
});

export const RejectedOptionSchema = z.object({
  decisionId: z.string(),
  option: z.string(),
  reason: z.string(),
  source: z.enum(['discussion', 'analysis', 'constraint', 'risk']),
  timestamp: z.string(),
  wouldHaveConsequences: z.string().optional()
});

export const AssumptionSchema = z.object({
  id: z.string(),
  decisionId: z.string(),
  assumption: z.string(),
  category: z.enum(['technical', 'business', 'user', 'market']),
  validityPeriod: z.string().optional(),
  validationStatus: z.enum(['valid', 'invalidated', 'unknown']),
  invalidatedAt: z.string().optional()
});

export const ConstraintSchema = z.object({
  id: z.string(),
  decisionId: z.string(),
  type: z.enum(['technical', 'business', 'regulatory', 'resource', 'time']),
  description: z.string(),
  impact: z.enum(['blocking', 'limiting', 'guiding']),
  source: z.string(),
  timestamp: z.string()
});

export const DesignPatternSchema = z.object({
  id: z.string(),
  decisionId: z.string(),
  pattern: z.string(),
  category: z.enum(['creational', 'structural', 'behavioral', 'architectural', 'enterprise']),
  implementation: z.string().optional(),
  justification: z.string(),
  confidence: z.number()
});

export const EvolutionTimelineSchema = z.object({
  decisionId: z.string(),
  evolution: z.array(z.object({
    id: z.string(),
    type: z.enum(['created', 'modified', 'superseded', 'deprecated']),
    timestamp: z.string(),
    reason: z.string(),
    author: z.string(),
    changes: z.array(z.string())
  }))
});

export const DependencyImpactSchema = z.object({
  decisionId: z.string(),
  dependenciesAffected: z.array(z.object({
    name: z.string(),
    type: z.enum(['added', 'removed', 'modified', 'version_changed']),
    previousVersion: z.string().optional(),
    newVersion: z.string().optional(),
    impact: z.enum(['breaking', 'compatible', 'patch'])
  })),
  sbomDiff: z.string().optional()
});

export const RiskSchema = z.object({
  id: z.string(),
  decisionId: z.string(),
  risk: z.string(),
  category: z.enum(['technical', 'business', 'operational', 'security', 'compliance']),
  probability: z.enum(['low', 'medium', 'high']),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  mitigation: z.string().optional(),
  status: z.enum(['identified', 'mitigated', 'accepted', 'transferred'])
});

export const MitigationSchema = z.object({
  riskId: z.string(),
  decisionId: z.string(),
  strategy: z.string(),
  implementation: z.string(),
  effectiveness: z.enum(['high', 'medium', 'low']),
  timestamp: z.string(),
  responsible: z.string()
});

export const RationaleDepthScoreSchema = z.object({
  decisionId: z.string(),
  score: z.number(), // 0-100
  factors: z.object({
    evidenceCount: z.number(),
    sourceDiversity: z.number(),
    analysisDepth: z.number(),
    stakeholderInvolvement: z.number(),
    documentationQuality: z.number()
  }),
  calculatedAt: z.string()
});

// =============================================================================
// LEVEL 3: CONTEXTE HUMAIN & ORGANISATIONNEL (11 types)
// =============================================================================

export const TeamStructureSchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(z.object({
    name: z.string(),
    email: z.string(),
    role: z.enum(['lead', 'senior', 'junior', 'principal', 'architect']),
    specializations: z.array(z.string()),
    startDate: z.string()
  })),
  responsibilities: z.array(z.string()),
  decisionScope: z.array(z.string())
});

export const ContributorProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  experience: z.object({
    yearsTotal: z.number(),
    yearsInProject: z.number(),
    domains: z.array(z.string())
  }),
  specialties: z.array(z.string()),
  contributionMetrics: z.object({
    commitsCount: z.number(),
    prsReviewed: z.number(),
    decisionsAuthored: z.number(),
    expertiseAreas: z.array(z.string())
  }),
  confidenceLevel: z.number()
});

export const DecisionAuthorSchema = z.object({
  decisionId: z.string(),
  authorName: z.string(),
  authorEmail: z.string(),
  role: z.string(),
  justificationAuthority: z.string(),
  stakeholderLevel: z.enum(['core', 'significant', 'minor'])
});

export const DecisionReviewerSchema = z.object({
  decisionId: z.string(),
  reviewerName: z.string(),
  reviewerEmail: z.string(),
  role: z.string(),
  decision: z.enum(['approved', 'rejected', 'requested_changes', 'commented']),
  comments: z.string().optional(),
  timestamp: z.string()
});

export const CrossTeamDependencySchema = z.object({
  decisionId: z.string(),
  dependentTeam: z.string(),
  dependencyType: z.enum(['api', 'service', 'data', 'infrastructure', 'process']),
  impact: z.enum(['high', 'medium', 'low']),
  status: z.enum(['identified', 'coordinated', 'resolved', 'blocked']),
  communicationChannel: z.string().optional()
});

export const BusinessObjectiveLinkSchema = z.object({
  decisionId: z.string(),
  objectiveId: z.string(),
  objectiveTitle: z.string(),
  objectiveType: z.enum(['OKR', 'KPI', 'initiative', 'milestone']),
  impact: z.enum(['direct', 'indirect', 'enabling']),
  metrics: z.array(z.string()).optional(),
  source: z.string() // Notion, Jira, etc.
});

export const PriorityDeadlineSchema = z.object({
  decisionId: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  deadline: z.string().optional(),
  businessTimeline: z.string().optional(),
  justification: z.string(),
  source: z.string()
});

export const BudgetImpactSchema = z.object({
  decisionId: z.string(),
  estimatedCost: z.object({
    development: z.number().optional(),
    infrastructure: z.number().optional(),
    maintenance: z.number().optional(),
    training: z.number().optional()
  }),
  expectedROI: z.number().optional(),
  paybackPeriod: z.string().optional(),
  currency: z.string().default('USD'),
  justification: z.string()
});

export const StakeholderNonTechSchema = z.object({
  decisionId: z.string(),
  name: z.string(),
  role: z.enum(['PM', 'designer', 'customer', 'business_stakeholder', 'legal', 'compliance']),
  involvement: z.enum(['informed', 'consulted', 'accountable', 'responsible']),
  concerns: z.array(z.string()).optional(),
  approvalRequired: z.boolean()
});

export const MeetingNoteSchema = z.object({
  decisionId: z.string(),
  meetingId: z.string(),
  timestamp: z.string(),
  participants: z.array(z.string()),
  keyPoints: z.array(z.string()),
  decisionsDiscussed: z.array(z.string()),
  actionItems: z.array(z.object({
    owner: z.string(),
    action: z.string(),
    dueDate: z.string().optional()
  })),
  transcriptSource: z.string().optional()
});

export const IntentCategorySchema = z.object({
  decisionId: z.string(),
  primaryIntent: z.enum(['performance', 'user_experience', 'compliance', 'cost', 'security', 'maintainability', 'scalability', 'innovation']),
  secondaryIntents: z.array(z.enum(['performance', 'user_experience', 'compliance', 'cost', 'security', 'maintainability', 'scalability', 'innovation'])).optional(),
  userImpact: z.enum(['direct', 'indirect', 'none']),
  businessValue: z.enum(['high', 'medium', 'low', 'unknown'])
});

// =============================================================================
// LEVEL 4: ÉVIDENCES & TRACE (8 types)
// =============================================================================

export const LinkedPRSchema = z.object({
  decisionId: z.string(),
  prId: z.string(),
  title: z.string(),
  description: z.string(),
  diffSummary: z.string().optional(),
  author: z.string(),
  reviewers: z.array(z.string()),
  status: z.enum(['open', 'merged', 'closed', 'draft']),
  mergedAt: z.string().optional(),
  mergeCommit: z.string().optional()
});

export const LinkedIssueSchema = z.object({
  decisionId: z.string(),
  issueId: z.string(),
  title: z.string(),
  description: z.string(),
  labels: z.array(z.string()),
  status: z.enum(['open', 'closed', 'in_progress', 'blocked']),
  author: z.string(),
  assignees: z.array(z.string()).optional(),
  createdAt: z.string(),
  closedAt: z.string().optional()
});

export const BenchmarkEvidenceSchema = z.object({
  decisionId: z.string(),
  benchmarkName: z.string(),
  files: z.array(z.string()),
  results: z.record(z.string(), z.any()),
  comparisons: z.array(z.object({
    competitor: z.string(),
    metric: z.string(),
    ourValue: z.number(),
    theirValue: z.number(),
    improvement: z.number()
  })),
  conclusion: z.string(),
  timestamp: z.string()
});

export const LinkedUnitTestSchema = z.object({
  decisionId: z.string(),
  testFiles: z.array(z.string()),
  testResults: z.object({
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    total: z.number(),
    coverage: z.number().optional()
  }),
  runTimestamp: z.string(),
  linkedToImplementation: z.array(z.string()).optional()
});

export const DiscussionThreadSchema = z.object({
  decisionId: z.string(),
  threadId: z.string(),
  platform: z.enum(['slack', 'github_discussions', 'teams', 'email']),
  title: z.string(),
  participants: z.array(z.string()),
  messageCount: z.number(),
  keyArguments: z.array(z.object({
    author: z.string(),
    argument: z.string(),
    timestamp: z.string(),
    supportLevel: z.enum(['for', 'against', 'neutral'])
  })),
  consensusLevel: z.enum(['unanimous', 'majority', 'divided', 'none']),
  link: z.string().optional()
});

export const DocumentationRFCSchema = z.object({
  decisionId: z.string(),
  docId: z.string(),
  title: z.string(),
  type: z.enum(['RFC', 'design_doc', 'specification', 'technical_note']),
  content: z.string().optional(),
  author: z.string(),
  reviewers: z.array(z.string()),
  status: z.enum(['draft', 'review', 'approved', 'rejected']),
  version: z.string(),
  link: z.string().optional()
});

export const CitedCommitSchema = z.object({
  decisionId: z.string(),
  commitHash: z.string(),
  message: z.string(),
  author: z.string(),
  timestamp: z.string(),
  files: z.array(z.string()),
  relevance: z.enum(['implementing', 'related', 'precedent', 'fixing']),
  justification: z.string().optional()
});

export const ExternalReferenceSchema = z.object({
  decisionId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  source: z.enum(['research_paper', 'blog_post', 'documentation', 'book', 'talk', 'case_study']),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  relevance: z.enum(['supporting', 'contradicting', 'contextual']),
  keyPoints: z.array(z.string()).optional()
});

export const EvidenceQualityScoreSchema = z.object({
  decisionId: z.string(),
  score: z.number(), // 0-100
  factors: z.object({
    evidenceCount: z.number(),
    recency: z.number(),
    sourceCredibility: z.number(),
    diversity: z.number(),
    verifiability: z.number(),
    stakeholderValidation: z.number()
  }),
  calculatedAt: z.string(),
  recommendations: z.array(z.string()).optional()
});

// =============================================================================
// MAIN RBOM PROJECT TYPE
// =============================================================================

export const RBOMProjectSchema = z.object({
  // Metadata
  id: z.string(),
  name: z.string(),
  description: z.string(),
  repository: z.string().optional(),
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // 7 Levels of RBOM Data
  level1: z.object({
    commits: z.array(CommitDataSchema),
    diffs: z.array(DiffSummarySchema),
    dependencies: z.array(DependencySchema),
    builds: z.array(BuildMetadataSchema),
    tests: z.array(LinkedTestSchema),
    benchmarks: z.array(BenchmarkMetricSchema),
    configs: z.array(ConfigFileSchema),
    architecture: z.array(ArchitectureMapSchema),
    codeOwners: z.array(CodeOwnerSchema),
    lineLinks: z.array(LineLevelLinkSchema)
  }).optional(),

  level2: z.object({
    decisions: z.array(ArchitecturalDecisionSchema),
    tradeoffs: z.array(TradeoffAnalysisSchema),
    rejections: z.array(RejectedOptionSchema),
    assumptions: z.array(AssumptionSchema),
    constraints: z.array(ConstraintSchema),
    patterns: z.array(DesignPatternSchema),
    evolution: z.array(EvolutionTimelineSchema),
    dependencyImpacts: z.array(DependencyImpactSchema),
    risks: z.array(RiskSchema),
    mitigations: z.array(MitigationSchema),
    rationaleScores: z.array(RationaleDepthScoreSchema)
  }).optional(),

  level3: z.object({
    teams: z.array(TeamStructureSchema),
    contributors: z.array(ContributorProfileSchema),
    authors: z.array(DecisionAuthorSchema),
    reviewers: z.array(DecisionReviewerSchema),
    crossTeamDeps: z.array(CrossTeamDependencySchema),
    businessObjectives: z.array(BusinessObjectiveLinkSchema),
    priorities: z.array(PriorityDeadlineSchema),
    budgets: z.array(BudgetImpactSchema),
    stakeholders: z.array(StakeholderNonTechSchema),
    meetings: z.array(MeetingNoteSchema),
    intents: z.array(IntentCategorySchema)
  }).optional(),

  level4: z.object({
    prs: z.array(LinkedPRSchema),
    issues: z.array(LinkedIssueSchema),
    benchmarkEvidence: z.array(BenchmarkEvidenceSchema),
    unitTests: z.array(LinkedUnitTestSchema),
    discussions: z.array(DiscussionThreadSchema),
    documentation: z.array(DocumentationRFCSchema),
    commits: z.array(CitedCommitSchema),
    references: z.array(ExternalReferenceSchema),
    evidenceScores: z.array(EvidenceQualityScoreSchema)
  }).optional(),

  // Analytics & Insights
  analytics: z.object({
    totalDecisions: z.number(),
    totalEvidence: z.number(),
    averageRationaleScore: z.number(),
    decisionVelocity: z.number(),
    mostActiveContributors: z.array(z.string()),
    mostImpactfulDecisions: z.array(z.string()),
    evidenceCoverage: z.object({
      decisionsWithEvidence: z.number(),
      decisionsWithoutEvidence: z.number(),
      coveragePercentage: z.number()
    }),
    crossTeamCollaboration: z.number(),
    businessAlignmentScore: z.number()
  }).optional()
});

export type RBOMProject = z.infer<typeof RBOMProjectSchema>;

// Export individual types for convenience
export type CommitData = z.infer<typeof CommitDataSchema>;
export type ArchitecturalDecision = z.infer<typeof ArchitecturalDecisionSchema>;
export type TeamStructure = z.infer<typeof TeamStructureSchema>;
export type LinkedPR = z.infer<typeof LinkedPRSchema>;
// ... add other types as needed