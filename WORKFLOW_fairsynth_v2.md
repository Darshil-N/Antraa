# FairSynth AI — Privacy-First Synthetic Data Generation Platform
## Complete Workflow, Architecture & Design Documentation v2.0

> **What changed in v2:** Bias detection is now a standalone optional module (not a mandatory pipeline phase). The core pitch is reframed around data privacy and compliance — bias auditing is a separate revenue stream and feature tier. Architecture, agents, UI, and pitch strategy updated accordingly.

---

## TABLE OF CONTENTS

1. [Project Vision & Core Concept](#1-project-vision--core-concept)
2. [Validated Market Position](#2-validated-market-position)
3. [System Overview & Core Principles](#3-system-overview--core-principles)
4. [Unique Value Propositions](#4-unique-value-propositions)
5. [Complete Tech Stack](#5-complete-tech-stack)
6. [System Architecture](#6-system-architecture)
7. [Data Flow Architecture — Core Pipeline](#7-data-flow-architecture--core-pipeline)
8. [Data Flow Architecture — Bias Audit Module](#8-data-flow-architecture--bias-audit-module)
9. [Multi-Agent Orchestration Pipeline](#9-multi-agent-orchestration-pipeline)
10. [Bias Audit Module — Standalone Engine](#10-bias-audit-module--standalone-engine)
11. [Synthetic Data Generation Engine](#11-synthetic-data-generation-engine)
12. [Database Schema & Storage Strategy](#12-database-schema--storage-strategy)
13. [Backend Architecture & API Design](#13-backend-architecture--api-design)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Page Structure & Routes](#15-page-structure--routes)
16. [UI Component Breakdown](#16-ui-component-breakdown)
17. [UI Design System](#17-ui-design-system)
18. [User Journey & Interaction Flow](#18-user-journey--interaction-flow)
19. [Output & Deliverables](#19-output--deliverables)
20. [Hardware Optimization Strategy](#20-hardware-optimization-strategy)
21. [Error Handling & Fallbacks](#21-error-handling--fallbacks)
22. [Performance Optimization](#22-performance-optimization)
23. [Hackathon Pitch Strategy](#23-hackathon-pitch-strategy)
24. [Pre-Flight Setup & Cold Start Protocol](#24-pre-flight-setup--cold-start-protocol)
25. [Data Destruction & Ephemerality Protocol](#25-data-destruction--ephemerality-protocol)
26. [RAG Knowledge Base Structure](#26-rag-knowledge-base-structure)
27. [Team Responsibilities Matrix](#27-team-responsibilities-matrix)

---

## 1. PROJECT VISION & CORE CONCEPT

### The Real-World Pain Being Solved

The pain is not primarily about regulatory fines. It is about projects that never happen.

A hospital wants to collaborate with a university research team on an ML model for early sepsis detection. The research team cannot sign a Business Associate Agreement because they are academic, not HIPAA-covered. The project dies unless the hospital can provide de-identified data that still preserves clinical patterns.

A fraud detection startup needs realistic transaction patterns to test their model, but they are pre-revenue and cannot afford compliance infrastructure to handle real financial data. Banks will not give them real data, and public datasets are outdated. They cannot prove the model works without data, and cannot get data without proving it works.

A Series A fintech gets a data governance audit from their lead investor before the next funding round. The investor asks: "How are you training models without leaking PII?" If the answer is "we use production data carefully," the round is delayed six months.

A hospital's AI ethics board asks: "Show us how patient data is anonymized." If they cannot answer, the AI project is frozen indefinitely.

These are the customers. Their pain is immediate, quantifiable, and currently has no simple on-premise solution.

### The Solution

FairSynth AI is a fully local, on-premise platform that:

- Accepts any sensitive dataset regardless of domain or schema
- Automatically detects PII, PHI, and sensitive attributes using AI agents
- Matches each column to the specific compliance regulation that governs it (HIPAA, GDPR, GLBA) via a RAG knowledge base
- Generates statistically faithful synthetic data with differential privacy guarantees
- Delivers a compliance certificate and audit trail that can be shown to regulators, ethics boards, or investors
- Optionally runs a standalone Bias Audit on the real data or the synthetic data to detect and quantify discriminatory patterns — separate from the main pipeline, triggerable independently

The result is data that organizations can safely use for AI training, research collaboration, partner sharing, and model testing — without touching real records.

### Who This Is For

**Primary — Data Owners (high-touch, enterprise sales, $100K–$500K contracts):**
- Hospital networks and health systems that need synthetic patient data for AI model training, multi-institution research collaboration, and ethics board approval
- Banks and financial institutions that need compliant transaction data for fraud detection, model testing, and regulatory submissions
- Government agencies operating under strict data sovereignty laws that prohibit cloud usage

**Secondary — Data Consumers (self-serve SaaS, $500–$5K/month, faster revenue):**
- AI startups that need realistic healthcare or financial datasets to train and validate models
- Academic research labs that need diverse, representative datasets not available in public repositories
- Fintech companies that need realistic synthetic banking data for demo environments and investor presentations

**Bias Audit Module Buyers (separate purchase, cross-sell or standalone):**
- HR technology companies that need to prove their hiring AI does not filter protected classes
- AI fairness auditing firms that need statistical evidence for compliance documentation
- Any data owner wanting to understand the bias characteristics of their dataset before or after synthesis

---

## 2. VALIDATED MARKET POSITION

### Competitive Landscape

**Gretel.ai** ($65M raised): Cloud-first synthetic data generation. Excellent product, but requires sending data to their servers. Enterprise regulated industries (EU healthcare, government, defense) are legally prohibited from using it. Gretel is SaaS-first because SaaS margins are better — they have deliberately left the on-premise regulated market because it is harder to scale.

**Mostly AI** ($25M raised): Similar positioning to Gretel, cloud-first, strong on financial data.

**Tonic.ai**: Focused on developer test data environments. Not compliance-focused.

**IBM AIF360**: Open-source bias detection toolkit only. No synthetic generation. Requires manual chaining with separate synthesis tools. No compliance intelligence, no certificate output.

**SDV (Synthetic Data Vault)**: Open-source Python library. Does statistical synthesis well but with no compliance awareness, no PII detection, no bias analysis, no UI, no certificate. A hospital's data team would need 6–12 months of engineering to build what FairSynth delivers out of the box.

### Defensible Differentiation

**The structural moat is the combination, not any single component.**

Nobody offers: schema-agnostic PII detection + regulation-specific compliance mapping via RAG + local LLM inference + differential privacy synthesis + human approval gate + compliance certificate — in a single on-premise product that requires no cloud credentials.

The "open source will eat you" concern is addressed specifically: the moat is not the UX on top of open source tools. The moat is the regulatory certification path (pursuing SOC 2, HIPAA BAA agreements that take 12+ months and hospitals cannot do themselves), the legal liability structure (we provide the certificate that lets a hospital CIO show their ethics board), and continuous compliance updates when GDPR and HIPAA rules change.

### Pricing Model

**Enterprise Tier (data owners, on-premise perpetual license):** $100K–$300K per year. Hospital networks, banks, government agencies. Long sales cycles (9–18 months), but sticky and high-value once closed.

**Professional Tier (SaaS, data consumers):** $500–$2,000/month. AI startups, research labs, fintechs. Self-serve onboarding, faster revenue, lower contract value but scalable.

**Bias Audit Add-on:** Sold separately or as a bundle. $10K–$50K for enterprise audit engagements; $200–$500/month as a SaaS add-on. Can also be sold as standalone datasets (pre-generated synthetic healthcare/financial datasets with bias reports attached).

**Realistic Year-1 Revenue Scenario:** 3–5 pilot enterprise customers at $50K–$150K each plus 20–40 SaaS subscribers at $1K/month = $250K–$1M ARR.

---

## 3. SYSTEM OVERVIEW & CORE PRINCIPLES

### Core Processing Philosophy

**Principle 1 — Schema Agnosticism:** The platform never hardcodes column names, domain logic, or dataset structure. Every decision about what a column means, whether it contains sensitive data, and how it should be handled is made dynamically by AI agents at runtime. Upload a hospital CSV today, a hiring dataset tomorrow, a financial records file the day after — the system handles all three without configuration.

**Principle 2 — Local-First Privacy:** All computation happens on the user's machine. No data is ever sent to an external API, cloud service, or remote server. LLMs run locally via Ollama. The vector database is embedded via ChromaDB. All statistical computation is in-process. This makes the platform legally usable by organizations that are prohibited from using cloud services.

**Principle 3 — Proof Over Trust:** The platform does not ask users to trust that it worked. Every privacy guarantee is backed by differential privacy epsilon/delta metrics. Every compliance decision is traceable to a specific HIPAA article or GDPR clause retrieved from the vector database. Every output is accompanied by a certificate that contains the mathematical evidence.

**Principle 4 — Bias Separation:** Real-world data is inherently biased because the world is biased. Making bias detection mandatory in the privacy pipeline would mean every dataset triggers bias warnings, desensitizing users or blocking adoption by those who only need compliance. Bias auditing is a separate, optional module — run it when you need to understand or document the fairness characteristics of your data, not as a forced gate in the synthesis flow.

### High-Level Processing Flow — Core Pipeline

```
Raw Sensitive Dataset
        ↓
[Phase 1] Schema Profiling & PII/PHI Detection (Profiler Agent + DuckDB)
        ↓
[Phase 2] Compliance Rule Matching (RAG Policy Agent → ChromaDB)
        ↓
[Phase 3] Human Review & Approval Interface (User Override Gate)
        ↓
[Phase 4] Synthetic Data Generation (SDV + Differential Privacy)
        ↓
[Phase 5] Validation & Quality Scoring (SDMetrics + Statistical Tests)
        ↓
[Phase 6] Audit Certificate Generation (PDF + JSON + SHA-256 Hash)
        ↓
Compliant Synthetic Dataset + Full Audit Trail + Compliance Certificate
```

### Optional Bias Audit Module (triggered independently)

```
Dataset (real OR synthetic, any stage)
        ↓
[Bias-1] Protected Attribute Detection (Bias Profiler Agent)
        ↓
[Bias-2] Fairness Metric Computation (AIF360 + SciPy)
        ↓
[Bias-3] Severity Classification & Interpretation (Bias Interpreter Agent)
        ↓
Bias Audit Report (PDF + JSON) with severity ratings and plain-English findings
```

### Key Constraints

- Hardware target: NVIDIA RTX 3050 (6GB VRAM), 24GB System RAM
- Core pipeline execution time: 4–6 minutes for datasets up to 500MB
- Bias audit execution time: 1–2 minutes as a standalone run
- Zero cloud dependency: All models and databases run locally
- Demo mode: Live processing with real data, no dummy outputs, no hardcoded values

---

## 4. UNIQUE VALUE PROPOSITIONS

**Schema-Agnostic + Fully Local:** Cloud tools like Gretel.ai and Mostly AI handle any schema but require sending data to their servers. FairSynth handles any schema AND stays fully on-premise — the only product in the market that does both simultaneously.

**Regulation-Specific Compliance Intelligence:** Rather than applying a generic "mask PII" rule, the platform retrieves the exact regulation governing each column. When a column contains "SSN" in a healthcare dataset, it applies HIPAA Safe Harbor Rule §164.514(b)(2)(i) specifically. When the same column appears in a financial dataset, it applies GLBA's Safeguards Rule instead. The compliance action is legally traceable, not just technically applied.

**Human-in-the-Loop with Full Transparency:** Every AI agent decision is shown to the user with a confidence score and the reasoning behind it. Users can override any classification before synthetic generation begins. This is not a black box — compliance officers can audit and approve every decision.

**Mathematical Proof of Privacy:** Differential privacy epsilon/delta metrics are not estimates or claims. They are mathematical guarantees. The certificate contains the exact epsilon budget consumed per column — a number regulators and ethics boards can verify independently.

**Bias Audit as a Standalone Service:** The bias detection module is not a gate — it is an instrument. Run it on real data to document what bias exists. Run it on synthetic data to verify the synthesis preserved the original distribution characteristics. Run it on competitor-provided datasets to audit claims of fairness. Sell it independently to organizations that need fairness documentation without needing synthetic generation.

**Compliance Certificate That Travels:** The output is not just synthetic data. It is synthetic data plus a PDF certificate that can be handed to a regulator, an ethics board, an investor, or a partner. The certificate contains the SHA-256 hash of the synthetic file, making it tamper-evident. The hospital CIO can hand this document to their ethics board and end the project freeze.

---

## 5. COMPLETE TECH STACK

### Frontend Layer

**Framework:** Next.js 14 with App Router and TypeScript. Server Components are used for static layout shells. Client Components handle all interactive pipeline state, real-time log streaming, chart rendering, and bias audit results display.

**Styling:** Tailwind CSS 3.4 with a custom design token system. The color palette avoids generic blue SaaS aesthetics and uses a warm dark theme with amber and teal accents to convey trust, precision, and technical authority.

**Animation:** Framer Motion 11 handles all state transition animations — agent status cards, progress pipeline flow, data appearing in charts, modal entrances, and bias severity badge reveals. Every meaningful state change has a corresponding animation.

**Data Visualization:** Recharts 2.10 is the primary charting library for distribution comparison charts, quality score gauges, and bias metric before/after comparisons. Chart.js 4.4 is used as a secondary library for Q-Q plots and residual plots that require finer rendering control.

**State Management:** Zustand manages global pipeline state — current phase, agent statuses, approval decisions, job progress, WebSocket connection state, and bias audit state (separate slice from core pipeline).

**UI Primitives:** Radix UI provides headless, accessible primitives for dialogs, toggles, dropdowns, tooltips, and progress indicators. Fully customized with the project design system.

**Real-time Communication:** Native WebSocket API connects the frontend to FastAPI for live agent log streaming. Every agent action, phase transition, and intermediate result streams in real time to the log panel.

**File Handling:** React Dropzone manages file upload UX — drag-and-drop, file type validation (CSV and Parquet only), size limit enforcement (500MB max), and upload progress display.

### Backend Layer

**API Framework:** FastAPI 0.109 with full async/await support. Background tasks handle long-running pipeline execution so HTTP requests return immediately with a job ID. WebSocket endpoints stream live updates. Automatic OpenAPI documentation for all endpoints.

**Database & Query Engine:** DuckDB 0.10 as the in-process analytical database. Handles CSV and Parquet ingestion directly, executes column profiling SQL queries in parallel using all available CPU cores, and stores intermediate pipeline state. Requires zero external setup, runs in memory with periodic disk checkpoints.

**Agent Orchestration:** LangGraph 0.0.20 manages the multi-agent workflow as an explicit state machine. Each agent is a node in the graph. Conditional routing logic determines which agent runs next. Memory is shared through a typed state object passed between nodes. The Bias Audit module runs as a completely separate LangGraph graph, not a node in the core pipeline.

**LLM Inference:** Ollama 0.1.23 serves local language models without API keys or internet connection. Primary model: Llama-3.1-8B in 4-bit GGUF quantized format for profiling and compliance phases. Phi-3-mini (3.8B, 4-bit GGUF) for the validation phase and all bias audit phases to reduce VRAM pressure.

**Vector Database:** ChromaDB 0.4.22 stores pre-embedded compliance documents. Embedding model: all-MiniLM-L6-v2 running locally. Documents chunked at 512 tokens with 50-token overlap. Pre-populated with HIPAA Safe Harbor rules, GDPR Articles 9 and 17, GLBA financial privacy standards, EEOC/ECOA fairness thresholds (for Bias Audit module), and domain-specific constraint libraries.

**Synthetic Data Generation:** SDV (Synthetic Data Vault) 1.9 with GaussianCopulaSynthesizer as the primary method. Statistical model (not neural network), trains in seconds on CPU without GPU memory, handles mixed data types natively, produces high-fidelity outputs on tabular data. CTGAN excluded from demo pipeline due to incompatible training time.

**Privacy Engine:** Diffprivlib 0.6 from IBM implements differential privacy noise injection. Manages epsilon and delta budgets, applies Laplace mechanism to numerical columns, exponential mechanism to categorical columns, and provides formal mathematical privacy guarantees.

**Bias Detection (module only):** AIF360 (IBM's AI Fairness 360 toolkit) for protected attribute analysis combined with custom statistical computation using SciPy and NumPy. Computes Demographic Parity Difference, Equal Opportunity Difference, Disparate Impact Ratio, and Statistical Parity Difference.

**Statistical Validation:** SDMetrics 0.12 computes post-generation quality scores including Kolmogorov-Smirnov tests per column, correlation matrix similarity, and overall quality percentage.

**Data Processing:** Pandas 2.1 for DataFrame operations and CSV parsing. NumPy 1.26 for vectorized statistical computation. Pydantic 2.5 for all API request/response validation.

**Report Generation:** ReportLab for PDF certificate generation. The certificate is a structured multi-section document, not a HTML-to-PDF conversion.

### Infrastructure Layer

**Containerization:** Docker 24 with GPU passthrough for CUDA acceleration. Docker Compose orchestrates three services: Next.js frontend, FastAPI backend, and Ollama inference server.

**Runtime:** Python 3.11 for the backend, Node.js 20 for the frontend, CUDA 12.1 for GPU operations.

**Process Management:** Uvicorn serves FastAPI. PM2 manages the Next.js process.

---

## 6. SYSTEM ARCHITECTURE

### Component Interaction Map

```
┌───────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js)                         │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ Upload Page │  │ Pipeline Page│  │   Results Dashboard    │   │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘   │
│         │                │                       │                 │
│         └────────────────┼───────────────────────┘                │
│                          │ HTTP / WebSocket                        │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              [Optional] Bias Audit Page                   │    │
│  │   Trigger independently on any dataset (real/synthetic)   │    │
│  └───────────────────────┬───────────────────────────────────┘    │
└──────────────────────────┼────────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────────┐
│                   FASTAPI BACKEND                                  │
│                          │                                         │
│  ┌────────────────────────▼──────────────────────────────────┐    │
│  │                    API Router Layer                        │    │
│  │  /upload  /start-pipeline  /approve  /ws/{job_id}         │    │
│  │  /download  /start-bias-audit  /ws/bias/{audit_id}        │    │
│  └──────────────┬───────────────────────────┬────────────────┘    │
│                 │                           │                      │
│  ┌──────────────▼──────────┐   ┌────────────▼──────────────┐      │
│  │  CORE PIPELINE GRAPH    │   │   BIAS AUDIT GRAPH        │      │
│  │  (LangGraph)            │   │   (LangGraph — separate)  │      │
│  │  Profiler Agent         │   │   Bias Profiler Agent     │      │
│  │  RAG Compliance Agent   │   │   Bias Metrics Agent      │      │
│  │  Human Approval Gate    │   │   Bias Interpreter Agent  │      │
│  │  Generator              │   └────────────┬──────────────┘      │
│  │  Validator              │                │                      │
│  │  Packager               │                │                      │
│  └──────────┬──────────────┘                │                      │
│             │                               │                      │
│  ┌──────────▼──────┐  ┌────────────┐  ┌────▼──────────────┐       │
│  │   DuckDB        │  │ ChromaDB   │  │ Ollama LLM Server │       │
│  │ (In-Memory)     │  │ (Vectors)  │  │ Llama-3.1-8B      │       │
│  └──────────┬──────┘  └────────────┘  │ Phi-3-mini        │       │
│             │                         └───────────────────┘       │
│  ┌──────────▼──────┐  ┌────────────────────────────────────┐      │
│  │  SDV + SDMetrics│  │   Diffprivlib + AIF360 + SciPy     │      │
│  │  (Statistics)   │  │   (Privacy + Bias Computation)     │      │
│  └─────────────────┘  └────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
```

### Service Boundaries

The frontend communicates with the backend exclusively through the API layer — never directly accessing DuckDB, ChromaDB, Ollama, or any Python library. All business logic lives in the backend. The frontend is purely a visualization and interaction layer.

The Core Pipeline Graph and the Bias Audit Graph are independent LangGraph execution graphs that share the Ollama inference server and ChromaDB instance but maintain completely separate job records, state objects, and WebSocket channels. A user can run a bias audit on a dataset at any time — before synthesis, after synthesis, or on any externally provided CSV — without touching the core pipeline.

---

## 7. DATA FLOW ARCHITECTURE — CORE PIPELINE

### Phase-by-Phase Data Movement

**Step 1: File Upload**
User drags a CSV or Parquet file onto the upload interface. The frontend computes an MD5 hash client-side for integrity verification and displays a 10-row preview. The file is sent via multipart POST to `/api/upload-dataset`. The backend saves it to `/tmp/uploads/{session_id}/` and returns a `job_id` (UUID4) and column headers for the preview component.

**Step 2: DuckDB Ingestion & Statistical Profiling**
DuckDB loads the file directly from disk. It computes per-column statistics in a single pass: count, null percentage, distinct values, min, max, mean, standard deviation, sample values, and inferred data type. This statistical profile is stored as a JSON object and passed to the Profiler Agent.

**Step 3: AI Schema Classification (Profiler Agent)**
The Profiler Agent receives the column statistics profile. For each column it determines: data type category (categorical/numerical/datetime/text), sensitivity classification (PII/PHI/SENSITIVE/SAFE), confidence score (0–1), and reasoning. Structured JSON output is validated against a Pydantic schema before proceeding. Rule-based fallback activates if LLM output fails after 3 retries.

**Step 4: Compliance Rule Retrieval (RAG Policy Agent)**
For every column classified as PII, PHI, or SENSITIVE, the RAG agent queries ChromaDB with a semantic embedding of the column name, sample values, and domain context. It retrieves the top-3 most relevant compliance rules and maps each rule to a required action (MASK/SUPPRESS/GENERALIZE/RETAIN_WITH_NOISE). The column profile is updated with the specific regulation citation and required handling action.

**Step 5: Human Approval Interface (Pipeline Pause)**
The pipeline pauses. The frontend displays the complete column classification with compliance requirements for each column. Every decision has an override toggle. Epsilon budget sliders allow users to configure privacy levels per column. The user approves or modifies the plan, then submits. The approval payload is sent to `/api/approve-plan` and the pipeline resumes.

**Step 6: Synthetic Generation**
The LLM is unloaded from VRAM before this phase. SDV's GaussianCopulaSynthesizer trains on the real data using only the approved columns. Differential privacy noise from Diffprivlib is injected into numerical columns using the epsilon budget configured in the approval interface. The number of synthetic rows generated is configurable (default: same count as original). The generator produces the synthetic DataFrame.

**Step 7: Validation & Quality Scoring**
SDMetrics runs a full quality report comparing real vs synthetic data: KS test per column, correlation matrix similarity score, overall quality percentage, and privacy risk score. Phi-3-mini is loaded (Llama unloaded from VRAM) to interpret and narrate the quality scores for the certificate.

**Step 8: Package & Export**
The final output package is assembled: synthetic CSV file, JSON audit trail, and PDF compliance certificate. All files are written to `/tmp/outputs/{job_id}/`. Download links are returned to the frontend.

---

## 8. DATA FLOW ARCHITECTURE — BIAS AUDIT MODULE

### When to Run the Bias Audit

The Bias Audit module can be triggered at any of three points:

- **On real data before synthesis:** Provides a baseline document of what biases exist in the original dataset. Useful for compliance documentation and ethics board submissions.
- **On synthetic data after synthesis:** Verifies that the synthesis process preserved the original bias characteristics (expected) and documents them for transparency.
- **On any externally provided dataset:** Hospitals can audit datasets from partner institutions. AI companies can audit datasets they purchased. This becomes a standalone service.

### Bias Audit Execution Flow

**Step 1: Dataset Intake**
The user uploads a dataset (or selects a previously processed synthetic file from the results dashboard). A separate `audit_id` is generated. The file is loaded into DuckDB for statistical profiling. This step reuses the same DuckDB infrastructure as the core pipeline but under a separate job record.

**Step 2: Protected Attribute Detection (Bias Profiler Agent)**
Phi-3-mini reviews column names, sample values, and the DuckDB statistical profile to identify probable protected attribute columns. Detection uses both keyword matching (gender, race, age, religion, nationality, disability) and semantic analysis (columns whose values suggest group membership). The agent outputs a list of probable protected attribute columns with confidence scores. The user can confirm or override this list before metric computation begins.

**Step 3: Outcome Column Identification**
The agent identifies probable outcome columns — columns whose values represent decisions, scores, or classifications that could be subject to discrimination claims. Examples: loan_approved, hired, diagnosed, credit_score_bucket. The user confirms the outcome column(s) to analyze.

**Step 4: Fairness Metric Computation**
AIF360 and SciPy compute the full metric suite for each protected attribute × outcome column combination:

- Demographic Parity Difference: Difference in positive outcome rates between groups. Legal concern threshold: above 0.1.
- Equal Opportunity Difference: Difference in true positive rates between groups.
- Disparate Impact Ratio: Ratio of positive outcome rates. Legal concern threshold: below 0.8 (EEOC 80% rule).
- Statistical Parity Difference: Probability difference of receiving a positive outcome across groups.
- Class Distribution Analysis: Frequency distribution per protected attribute class (detects underrepresentation).

**Step 5: Severity Classification**
Each finding is classified based on regulatory thresholds retrieved from ChromaDB's fairness knowledge base:

- CRITICAL: Disparate Impact Ratio below 0.6 or Demographic Parity Difference above 0.3
- HIGH: Disparate Impact Ratio 0.6–0.8 or Demographic Parity Difference 0.2–0.3
- MEDIUM: Disparate Impact Ratio 0.8–0.9 or Demographic Parity Difference 0.1–0.2
- LOW: Statistically notable but below legal threshold levels

**Step 6: Bias Interpreter Agent**
Phi-3-mini generates a plain-English interpretation for each finding. The interpretation explains what the metric means, what legal standard it relates to (EEOC, Fair Housing Act, ECOA), which groups are affected and how, and what the practical implication is for an organization using this data for AI training. This narration is written at a level readable by a compliance officer, not just a data scientist.

**Step 7: Report Generation**
Output: a PDF Bias Audit Report and a machine-readable JSON. The report contains the dataset summary, methodology, all findings with severity ratings, the Bias Interpreter Agent's plain-English narration, a statistical appendix with all raw metric values, and a footer with the SHA-256 hash of the audited file.

### What the Bias Audit Does NOT Do

The Bias Audit module does not modify data. It does not correct, reweight, or alter any records. It is a documentation and diagnostic tool, not a correction tool. This distinction is philosophically important: the world is biased, real data reflects reality, and honest documentation of that bias is more defensible than opaque automated correction. Organizations that want bias-corrected synthetic data can use the audit report as evidence of what existed, combined with the synthetic dataset as their forward-looking training data — but those are two separate decisions made by a human, not one automated black box.

---

## 9. MULTI-AGENT ORCHESTRATION PIPELINE

### Core Pipeline Agents

**Agent 1 — Schema Profiler**
- Trigger: Receives column statistics JSON from DuckDB
- Model: Llama-3.1-8B (4-bit quantized)
- Responsibility: Classify every column for data type, sensitivity level, and domain context
- Output Format: Structured JSON object keyed by column name with sensitivity_class, confidence, and domain_context fields
- Validation: Pydantic model checks all required keys, valid enum values, confidence range 0–1
- Fallback: Rule-based classifier using regex patterns and keyword matching if LLM output is invalid after 3 retries

**Agent 2 — RAG Compliance Policy Agent**
- Trigger: Receives classified columns with sensitivity flags
- Model: Llama-3.1-8B (same loaded instance, no VRAM reload)
- Tools: ChromaDB semantic search
- Responsibility: Map each sensitive column to specific compliance rules and required actions
- Query Strategy: Per-column queries use column name + sample values + domain context as embedding input
- Output Format: Compliance action plan per column with regulation citation (e.g., "HIPAA-SH-04: SSN — SUPPRESS, citation: §164.514(b)(2)(i)")
- Fallback: Default to SUPPRESS action for any PII/PHI column if retrieval fails

**Human Approval Gate (Not an Agent)**
- This is a pipeline pause point, not an AI decision
- The orchestrator emits a `WAITING_FOR_APPROVAL` WebSocket event
- The frontend transitions to the approval interface
- The pipeline resumes only when the backend receives the `POST /api/approve-plan` request
- The user's approval decisions are stored in the DuckDB `column_profiles` table

**Agent 3 — Validation Reporter**
- Trigger: Receives synthetic dataset and SDMetrics quality scores
- Model: Phi-3-mini (Llama-3.1-8B unloaded from VRAM before generation, Phi loaded after)
- Responsibility: Interpret quality scores, flag concerns, generate the human-readable narrative section of the compliance certificate
- Output: Validation report in natural language + structured quality scores object

### Bias Audit Module Agents (Separate Graph)

**Bias Agent 1 — Bias Profiler**
- Trigger: Receives column statistics JSON from DuckDB audit job
- Model: Phi-3-mini
- Responsibility: Identify probable protected attribute columns and outcome columns from column names, sample values, and statistical distributions
- Output: List of (protected_attribute_column, confidence) pairs and (outcome_column, confidence) pairs

**Bias Agent 2 — Bias Metrics Executor**
- Trigger: Receives confirmed protected attribute and outcome columns
- Model: No LLM — pure statistical computation using AIF360 and SciPy
- Responsibility: Compute full fairness metric suite for all attribute × outcome combinations
- Output: Structured bias findings JSON with raw metric values and severity classifications per finding

**Bias Agent 3 — Bias Interpreter**
- Trigger: Receives bias findings JSON
- Model: Phi-3-mini
- Responsibility: Generate plain-English interpretation for each finding. Contextualize each severity level. Explain the applicable legal standard. Write the narrative section of the Bias Audit Report.
- Output: Bias Audit Report narrative + structured findings JSON

### Agent Communication Protocol

All agents communicate exclusively through the LangGraph shared state object. No agent writes directly to the database or emits WebSocket events. All side effects are handled by the orchestrator after each agent node completes. This separation ensures that if any agent fails, the orchestrator can retry just that node without re-running the full pipeline.

---

## 10. BIAS AUDIT MODULE — STANDALONE ENGINE

### Design Philosophy

Real-world data is biased because the world is biased. This is not a defect in data collection — it is an accurate reflection of historical and systemic inequalities. A tool that forces users to "fix" bias before proceeding assumes that bias correction is always desirable and always possible. That assumption is wrong for many legitimate use cases.

A hospital training a sepsis prediction model needs data that reflects actual patient population demographics — even if those demographics are unequal. A synthetic dataset that inflates the representation of underrepresented groups might produce a model that performs worse on real patient populations.

The Bias Audit module is therefore designed as an instrument of measurement and documentation, not intervention. It gives organizations the statistical evidence they need to:

1. Understand what biases exist in their data before training models on it
2. Document those biases transparently for ethics boards, regulators, and auditors
3. Make informed human decisions about whether and how to address them
4. Demonstrate to partners or investors that they have assessed their data responsibly

### Supported Analysis Targets

The module accepts any CSV or Parquet file. It does not require that the file came from the core FairSynth pipeline — it can analyze any dataset provided by the user. This makes it usable as a standalone audit tool sold independently to organizations that have no interest in synthetic data generation but need fairness documentation.

### Metrics Reference

**Demographic Parity Difference (DPD):** The difference in rate of positive outcomes between the group with the highest positive rate and the group with the lowest positive rate, for a given protected attribute. A value of 0 means all groups receive positive outcomes at equal rates. Higher values indicate greater disparity. Legal concern threshold for employment contexts: above 0.1.

**Equal Opportunity Difference (EOD):** The difference in true positive rates (recall) between groups. Measures whether qualified individuals from different groups are identified at equal rates. Legal concern threshold: above 0.1.

**Disparate Impact Ratio (DIR):** The ratio of positive outcome rates between the least-favored group and the most-favored group. A value of 1.0 means equal treatment. A value below 0.8 triggers the EEOC's "80% rule" adverse impact threshold used in US employment discrimination law. Values below 0.6 indicate severe disparity.

**Statistical Parity Difference (SPD):** The probability difference of receiving a positive outcome between groups, measured across the full marginal distribution.

**Class Distribution Imbalance:** The ratio of the smallest group count to the largest group count for a protected attribute. Values below 0.1 indicate severe underrepresentation that may cause model bias even if label distributions appear balanced.

---

## 11. SYNTHETIC DATA GENERATION ENGINE

### Generation Method Selection

The primary method is GaussianCopulaSynthesizer from the SDV library. It is chosen over CTGAN for three reasons: it trains in seconds rather than minutes on CPU, it does not require GPU memory during generation (freeing VRAM for the validation agent), and it handles mixed data types (categorical, numerical, datetime) natively without preprocessing engineering.

CTGAN is explicitly excluded from the demo pipeline due to its training time (5–20 minutes per dataset) being incompatible with a live demonstration. It may be offered as a "High Fidelity Mode" toggle for non-demo production use where training time is not a constraint.

### Differential Privacy Application

Differential privacy is applied at the column level using the epsilon-delta framework from Diffprivlib. The epsilon budget (lower = more private, higher = more statistically accurate) is configurable per column in the approval interface with three presets:

- **Strong Privacy (ε = 0.1):** Maximum noise injection. Suitable for highly sensitive medical identifiers and SSNs.
- **Balanced (ε = 1.0):** Moderate noise. Suitable for general PII and financial identifiers.
- **Light (ε = 10.0):** Minimal noise. Suitable for low-sensitivity numerical columns where statistical accuracy is critical for model training quality.

The system tracks the total privacy budget consumed across all columns and displays it as a "privacy budget meter" in the approval interface. Laplace mechanism is used for numerical columns; exponential mechanism for categorical columns.

### Column Handling Strategy

- PII columns flagged SUPPRESS: Completely excluded from synthesis — no corresponding column in output
- PII columns flagged GENERALIZE: Values are bucketed before training (exact age → age range 30–40)
- PII columns flagged MASK: Realistic but non-traceable fake values generated (random names, reformatted SSN-style tokens)
- PHI columns: Handled per HIPAA Safe Harbor — the 18 specific identifier types are suppressed
- SENSITIVE columns: Synthesized with differential privacy noise applied
- SAFE columns: Synthesized normally, optional light DP noise

### Quality Guarantee

Synthetic data quality is measured against two thresholds. A Kolmogorov-Smirnov similarity score above 0.85 per column is the quality target. An overall SDMetrics quality score above 0.80 is the minimum acceptable for the compliance certificate to be issued. If quality falls below this threshold, the system reports the gap and generates the certificate with a quality caveat rather than silently producing a low-fidelity dataset.

---

## 12. DATABASE SCHEMA & STORAGE STRATEGY

### Job State Schema (DuckDB)

**jobs table:** job_id (UUID), session_id, job_type (SYNTHESIS / BIAS_AUDIT), filename, file_size_bytes, upload_timestamp, current_phase (enum: UPLOADED / PROFILING / COMPLIANCE / AWAITING_APPROVAL / GENERATING / VALIDATING / COMPLETE / FAILED), created_at, updated_at.

**column_profiles table:** job_id, column_name, inferred_type, sensitivity_class, confidence_score, compliance_action, compliance_rule_citation, user_override (boolean), user_override_value, approved (boolean), epsilon_budget (float).

**bias_audit_results table:** audit_id, source_job_id (nullable — set if auditing a FairSynth output), filename, protected_attribute_column, outcome_column, metric_name, metric_value, severity, affected_groups (JSON array), interpreter_narration (text), computed_at.

**quality_scores table:** job_id, overall_quality_score, ks_test_scores (JSON), correlation_similarity, privacy_risk_score, generated_at.

**agent_logs table:** job_id, agent_name, log_level (INFO/WARNING/ERROR), message, timestamp, phase.

**audit_destruction_log table:** job_id, destruction_trigger, destruction_timestamp, files_destroyed (JSON array).

### File Storage Layout

All temporary files are stored under `/tmp/fairsynth/{job_id}/`:
- `raw_upload.csv` — original uploaded file (destroyed per Section 25)
- `profiled_schema.json` — column profile output
- `compliance_plan.json` — compliance action plan with regulation citations
- `approval_payload.json` — user's approval decisions including all overrides and epsilon values
- `synthetic_data.parquet` — generated synthetic dataset
- `validation_report.json` — SDMetrics output and quality scores
- `outputs/synthetic_data.csv` — final downloadable CSV
- `outputs/audit_trail.json` — complete processing log
- `outputs/compliance_certificate.pdf` — generated PDF certificate

Bias audit jobs stored under `/tmp/fairsynth/bias/{audit_id}/`:
- `audit_input.csv` — audited dataset copy (destroyed after report generation)
- `bias_findings.json` — full metric computation output
- `outputs/bias_audit_report.pdf` — downloadable PDF report
- `outputs/bias_findings.json` — machine-readable findings export

---

## 13. BACKEND ARCHITECTURE & API DESIGN

### Core Pipeline Endpoint Catalog

**POST /api/upload-dataset**
Accepts multipart file upload. Validates file type and size. Saves to temporary storage. Initializes a job record in DuckDB. Returns `job_id`, column preview (first 10 rows), and column names.

**POST /api/start-pipeline/{job_id}**
Triggers the LangGraph core pipeline as a FastAPI background task. Returns immediately with `{"status": "started", "job_id": "..."}`. Actual pipeline runs asynchronously, streaming updates via WebSocket.

**GET /ws/{job_id}**
WebSocket endpoint for live pipeline monitoring. Event types: PHASE_CHANGE, AGENT_LOG, COLUMN_CLASSIFIED, AWAITING_APPROVAL, GENERATION_PROGRESS, VALIDATION_RESULT, PIPELINE_COMPLETE, PIPELINE_ERROR.

**GET /api/pipeline-status/{job_id}**
REST polling fallback if WebSocket drops. Returns current phase, completion percentage, and latest log entries.

**POST /api/approve-plan/{job_id}**
Accepts user approval payload: column decisions with overrides and epsilon budget values. Resumes paused pipeline. Returns `{"status": "resumed"}`.

**GET /api/results/{job_id}**
Returns complete results: quality scores, column processing summary, download URLs.

**GET /api/download/{job_id}/{file_type}**
file_type: `synthetic_csv`, `audit_trail`, `certificate`. Streams file as download. Triggers destruction timer upon successful download.

**POST /api/acknowledge-download/{job_id}**
Records download completion, schedules 60-second destruction timer for raw files.

### Bias Audit Endpoint Catalog

**POST /api/bias-audit/start**
Accepts file upload (or reference to existing `job_id` output). Creates audit_id. Triggers Bias Audit LangGraph as background task.

**GET /ws/bias/{audit_id}**
WebSocket endpoint for bias audit progress. Events: PROTECTED_ATTRS_DETECTED, OUTCOME_COLS_DETECTED, AWAITING_CONFIRMATION, METRICS_COMPUTING, INTERPRETATION_GENERATING, AUDIT_COMPLETE.

**POST /api/bias-audit/confirm/{audit_id}**
User confirms or overrides the detected protected attribute and outcome columns. Resumes the audit.

**GET /api/bias-audit/results/{audit_id}**
Returns complete bias audit findings and download URLs.

**GET /api/bias-audit/download/{audit_id}/{file_type}**
file_type: `report_pdf`, `findings_json`.

### Background Task & Pipeline Lifecycle

When `/start-pipeline` or `/bias-audit/start` is called, FastAPI schedules the respective LangGraph orchestrator as a background task. The orchestrator runs completely asynchronously. After each node completes, it writes state to DuckDB and emits an event to a message queue. A WebSocket sender coroutine reads from the queue and pushes events to the connected client. If the user temporarily disconnects and reconnects, they receive a replay of all events since the last known state.

---

## 14. FRONTEND ARCHITECTURE

### Application Structure

The Next.js application uses the App Router pattern. The top-level layout (`app/layout.tsx`) provides the design system wrapper, global fonts, and the Zustand store provider. Individual page directories contain `page.tsx`, `loading.tsx`, and `error.tsx`.

### State Management Design

The Zustand store is the single source of truth for all pipeline-related state, divided into logical slices:

**Upload slice:** file object, upload progress, job_id, column preview, upload error.

**Pipeline slice:** current phase, phase history, WebSocket connection status, agent logs array, column classifications array.

**Approval slice:** column decisions map (keyed by column name), epsilon budget values per column, modified flag, approval submitted flag.

**Results slice:** quality scores object, download URLs.

**BiasAudit slice:** audit_id, detected attributes, detected outcomes, confirmation status, findings array, audit phase, download URLs.

### WebSocket Management

A dedicated WebSocket manager class handles connection lifecycle, reconnection with exponential backoff (up to 5 attempts), event parsing, and dispatching to the Zustand store. Log events are throttled to 10 UI updates per second to prevent React re-render overload while feeling live. Separate manager instances handle the core pipeline WebSocket and the bias audit WebSocket independently.

### Component Architecture Pattern

Every major UI section is a compound component: a parent container reads from the Zustand store and passes data to stateless child components that purely render. Business logic stays out of rendering components.

---

## 15. PAGE STRUCTURE & ROUTES

### Route Map

**/ (Root / Landing)**
Product introduction. Platform name and tagline. Brief one-paragraph description. Prominent "Upload Dataset" CTA. Three feature cards: Privacy, Compliance, Bias Audit. Minimal, confident copy that reads like compliance infrastructure, not a startup landing page.

**/upload**
Full-page drag-and-drop upload zone. Accepted format labels (CSV / Parquet, max 500MB). File preview table appears after upload showing first 10 rows and column names. Amber-highlighted columns that pattern-match likely sensitive fields (client-side keyword hint before any AI runs). "Start Analysis" button activates once file is successfully uploaded. Small secondary link: "Run Bias Audit Only" — opens bias audit flow without triggering core pipeline.

**/pipeline/[job_id]**
Live pipeline monitoring page. Three primary sections:

- Pipeline progress rail (left): Vertical stepper with 6 core pipeline phases (PROFILING, COMPLIANCE, AWAITING_APPROVAL, GENERATING, VALIDATING, COMPLETE). Each phase has live status indicators (waiting/active/complete/error) and a timestamp.
- Live log panel (center): Scrolling terminal-style log streaming every agent action in real time. Color-coded by agent and severity.
- Approval overlay (full-screen modal): Appears when the pipeline reaches AWAITING_APPROVAL. Shows complete column classification table, compliance action per column, toggle overrides, and epsilon budget sliders per column. No bias findings in this view — the bias audit is a separate flow.

**/results/[job_id]**
Final results dashboard. Four sections: Quality Metrics panel (overall score gauge + per-column KS scores), Privacy Budget Summary (epsilon values applied per column), Column Processing Summary (table of all columns with their handling), Download Panel (three file download cards). Optional launch button: "Run Bias Audit on This Synthetic Data."

**/bias-audit**
Standalone bias audit entry point. Upload any dataset, or select from a previous synthesis result. Shows confirmation step for protected attribute and outcome column selection before running. Redirects to `/bias-audit/[audit_id]` on start.

**/bias-audit/[audit_id]**
Live bias audit monitoring. Simpler progress rail (4 phases). Streaming log. Confirmation modal for attribute/outcome columns. Results section shows all findings as expandable cards sorted by severity.

**/about**
Technical methodology for judges, compliance officers, or technical evaluators. Explains differential privacy, the fairness metrics used, the compliance framework, and honest statements of the platform's limitations.

---

## 16. UI COMPONENT BREAKDOWN

### Upload Page Components

**DropZone:** Three states — idle (dashed border, instructions), dragover (highlighted border, "Drop to upload"), uploaded (filename, size, type confirmation). Rejects non-CSV/Parquet files with inline error. Bottom-left secondary link: "Just audit for bias."

**FilePreviewTable:** First 10 rows in a scrollable table. Column headers show inferred data type badges. Columns with names matching PII/PHI keywords pre-highlighted in amber as an early warning hint.

**UploadProgressBar:** Byte-level upload progress. Disappears once upload completes and preview appears.

### Pipeline Page Components

**PipelineProgressRail:** Vertical stepper with 6 labeled steps. Each step: icon (pending/spinner/checkmark/error), label, timestamp on completion. Active step pulses with animation.

**AgentLogPanel:** Virtualized scrolling log terminal. Each entry: timestamp, agent name badge, severity indicator, message text. Auto-scroll pauseable by scrolling up. Color coding: teal for INFO, amber for WARNING, red for ERROR, indigo for agent-specific messages.

**AgentStatusCard:** Floating top-right card when an agent is active. Shows agent name, what it is processing, thinking animation, elapsed time. Smoothly transitions between agents.

**ApprovalInterface (Full-Screen Modal):**

Sub-panel 1 — Column Classification Table: Every column listed as a row. Each row: column name, detected type, sensitivity classification (color-coded badge), compliance action required (e.g., "SUPPRESS — HIPAA §164.514(b)(2)(i)"), toggle override control. Approved columns show a green check; user-overridden columns show an amber edit indicator.

Sub-panel 2 — Privacy Budget Panel: Total epsilon budget remaining displayed as a gauge. Each SENSITIVE/PHI/PII column has a three-option selector (Strong / Balanced / Light) for the user to set its privacy level. Budget gauge updates in real time as selections change.

Sticky footer bar: "Approve & Generate" button. Shows count of unapproved columns if any remain. Does not show bias warnings here — that is not the purpose of this modal.

### Results Page Components

**QualityScoreCard:** Overall synthetic data quality percentage as a circular gauge. Per-column KS test scores in a table (green > 0.9, amber 0.7–0.9, red < 0.7).

**PrivacyBudgetSummary:** Table showing epsilon value applied to each column, with a plain-English label (Strong / Balanced / Light) alongside the numeric value.

**ColumnProcessingSummary:** Table of all input columns showing: original column name, sensitivity classification, compliance action taken, whether the column appears in the output or was suppressed.

**DistributionComparisonChart:** Side-by-side overlay Recharts AreaChart showing distribution of a selected column in real vs synthetic data. Column selector dropdown for exploration.

**DownloadPanel:** Three download cards — synthetic CSV, audit trail JSON, compliance certificate PDF. Each card shows file type icon, description, file size, and download button. "Run Bias Audit on This Data" button below the panel.

### Bias Audit Page Components

**BiasProgressRail:** Four-step vertical stepper (PROFILING / AWAITING_CONFIRMATION / COMPUTING / INTERPRETING).

**AttributeConfirmationModal:** Shows detected protected attribute columns and outcome columns with confidence scores. User can confirm, remove, or manually add columns before metrics run.

**BiasFindings:** List of expandable cards, one per finding, sorted by severity (CRITICAL first). Each card: severity badge, protected attribute name, outcome column name, key metric value, and the plain-English interpretation from the Bias Interpreter Agent. Expandable section shows full metric table.

**BiasAuditDownloadPanel:** Two download cards — PDF report and JSON findings export.

---

## 17. UI DESIGN SYSTEM

### Color Palette

Dark base theme. Warm accent colors that distinguish from generic SaaS blue.

**Background layers:**
- Base: #0E0F11 (near-black)
- Surface 1: #161820 (dark panels)
- Surface 2: #1E2030 (card backgrounds)
- Surface 3: #252840 (elevated elements)

**Accent colors:**
- Primary: #F59E0B (amber — trust, data intelligence, compliance)
- Secondary: #14B8A6 (teal — privacy, safety, verification)
- Success: #22C55E (green)
- Warning: #F97316 (orange)
- Error: #EF4444 (red)
- Info: #6366F1 (indigo — agent messages)

**Severity colors (Bias Audit):**
- CRITICAL: #EF4444 with 20% opacity background
- HIGH: #F97316 with 20% opacity background
- MEDIUM: #F59E0B with 20% opacity background
- LOW: #6366F1 with 20% opacity background

**Text:**
- Primary: #F8FAFC
- Secondary: #94A3B8
- Muted: #475569
- Inverted: #0E0F11

### Typography

**Headings:** Inter Bold — all page titles and section headers
**Body:** Inter Regular — all paragraph and label text
**Code/Logs:** JetBrains Mono — agent log panel and JSON previews exclusively
**Numbers/Metrics:** Inter with Tabular Numerals feature — metric numbers align correctly in comparison tables

### Spacing System

Base unit: 4px. All spacing multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96px.

### Motion Design

All animations communicate system state, not decoration.

- Phase transitions: 300ms ease-out slide
- Agent card entry: 200ms spring (bounce: 0.3) — conveys liveliness
- Log entries: 150ms fade-in from bottom — conveys streaming
- Chart data reveal: 600ms stagger — conveys computation completing
- Approval modal: 400ms scale-up from center — conveys importance
- Bias severity badges: 250ms sequential reveal (CRITICAL first, then HIGH, etc.) — builds dramatic tension in the demo
- Error states: 200ms shake horizontal — conveys rejection clearly

### Iconography

Lucide React. Specific icons: Shield (privacy), Scale (fairness/bias), FileText (compliance certificate), Bot (agents), BarChart (metrics), Download (exports), AlertTriangle (warnings/CRITICAL), CheckCircle (success), Loader2 (spinning active states), Search (bias audit).

---

## 18. USER JOURNEY & INTERACTION FLOW

### Core Pipeline Journey

**Arrival:** User lands on root page. Platform name "FairSynth AI" and single-line pitch. Three cards: "Make your data private", "Get a compliance certificate", "Audit for bias." One primary button: "Upload Dataset."

**Upload:** User drops CSV. Preview table appears. Amber-highlighted columns signal likely sensitive data. "Start Analysis" button becomes active.

**Monitoring:** Pipeline page loads. Phase 1 active. Log panel fills with real-time messages: "Profiler Agent: Analyzing column 'patient_age'... classified as NUMERICAL, sensitivity: PHI, confidence: 0.94." Agent status cards appear and disappear as each completes.

**Approval:** After 60–90 seconds, pipeline pauses. Approval modal appears. User sees every column with its classification and the specific regulation citation that governs it. They set epsilon Strong for the SSN column, leave all other defaults, and click "Approve & Generate."

**Generation:** Log shows "LLM models unloaded — VRAM freed for generation. SDV GaussianCopulaSynthesizer training on 43 approved columns. Differential privacy noise injection: ε=0.1 applied to SSN-equivalent, ε=1.0 to 8 columns, ε=10.0 to 34 columns." After 2–3 minutes, generation completes.

**Results:** Quality score 87% in the circular gauge. Distribution comparison charts for key columns. Three download cards. Below the cards: "Run Bias Audit on This Synthetic Data" button — available but not forced.

**Certificate:** PDF contains processing date, dataset stats, compliance rules applied with specific citations, privacy epsilon budgets per column, quality scores, and SHA-256 hash of the synthetic file.

### Bias Audit Journey (Standalone)

**Entry:** User clicks "Run Bias Audit Only" on the upload page, or navigates to `/bias-audit` directly, or clicks "Run Bias Audit on This Synthetic Data" from the results page.

**Upload/Select:** User uploads a dataset or selects their synthetic output. Audit starts.

**Confirmation:** After the Bias Profiler Agent runs (~20 seconds), a confirmation modal appears: "We detected these probable protected attributes: gender (confidence: 0.97), race (confidence: 0.93), age (confidence: 0.89). Probable outcome column: loan_approved (confidence: 0.96). Confirm or adjust." User confirms.

**Computing:** Log streams metric computation progress. "Computing Disparate Impact Ratio for gender × loan_approved... DIRatio = 0.61 (CRITICAL — below EEOC 80% threshold)."

**Results:** Bias findings cards sorted by severity. First card: "CRITICAL — Gender Bias in Loan Approval. Male applicants are approved 1.63× more often than female applicants. Disparate Impact Ratio: 0.61. This falls below the EEOC's 80% rule (DIR < 0.8), which constitutes adverse impact under US employment and lending law. This finding does not mean your model is illegal — it documents the bias in your historical data. Organizations using this data for model training should evaluate whether this pattern reflects legitimate business factors or historical discrimination." User downloads the PDF report.

---

## 19. OUTPUT & DELIVERABLES

### Core Pipeline Outputs

**Output 1 — synthetic_data.csv**
The final synthetic dataset. Contains only approved columns with all PII suppressed or replaced, all remaining columns synthesized with statistical fidelity, and differential privacy noise applied per the approved epsilon budgets. Usable directly as training data for AI/ML models.

**Output 2 — audit_trail.json**
Complete machine-readable processing record. Includes: every agent's output and confidence score, every compliance rule retrieved and applied with specific citation, all user approval decisions including overrides, generation parameters (epsilon values, row count, SDV model used), and SDMetrics validation scores. Satisfies enterprise audit requirements.

**Output 3 — compliance_certificate.pdf**
Human-readable PDF. Sections: cover page with platform name, processing date, and dataset identifier; privacy compliance section listing each column, the regulation that governs it, and the action taken; quality assurance section with SDMetrics scores; footer with SHA-256 hash of the synthetic file for integrity verification. Designed to be handed directly to a regulator, ethics board, or investor.

### Bias Audit Outputs

**Output 1 — bias_audit_report.pdf**
Multi-section PDF. Cover page with audit date and dataset identifier. Methodology section explaining metrics. Findings section with one page per CRITICAL and HIGH finding, summary table for MEDIUM and LOW. Statistical appendix with raw metric values for all computations. Footer with SHA-256 hash of audited file.

**Output 2 — bias_findings.json**
Machine-readable findings export. Contains all findings with metric values, severity classifications, affected groups, and Bias Interpreter narration. Designed for programmatic integration with compliance management systems.

---

## 20. HARDWARE OPTIMIZATION STRATEGY

### Sequential VRAM Management

The RTX 3050's 6GB VRAM cannot support all models simultaneously. The pipeline is explicitly designed around sequential loading.

**Core Pipeline Phase 1–2 (Profiling, Compliance):** Llama-3.1-8B at 4-bit GGUF loaded once, serves both agents sequentially. VRAM: ~4.5GB model + ~200MB ChromaDB embeddings = ~4.7GB total. 1.3GB remains for CUDA overhead.

**Core Pipeline Phase 4 (Synthetic Generation):** ALL LLMs unloaded from VRAM completely before SDV training begins. Explicit garbage collection and CUDA cache clear triggered. SDV GaussianCopulaSynthesizer uses CPU and system RAM only. VRAM drops to ~0.5GB (driver overhead only).

**Core Pipeline Phase 5 (Validation):** Phi-3-mini (3.8B, 4-bit GGUF) loaded as lighter model. VRAM: ~2.5GB, leaving 3.5GB for computation buffers.

**Bias Audit (any phase):** Phi-3-mini used throughout for all Bias Audit agents. Consistent ~2.5GB VRAM consumption. If bias audit runs concurrently with core pipeline, VRAM scheduler ensures Bias Audit only loads Phi when core pipeline is in a CPU-only phase (generation). They never share VRAM simultaneously.

### RAM Allocation (24GB Total)

- 4GB: DuckDB in-memory operations
- 3GB: SDV model training data
- 4GB: Agent context windows and intermediate JSON
- 3GB: Statistical computation buffers (NumPy, AIF360, SciPy)
- 2GB: FastAPI backend operations
- 2GB: CSV handling up to 500MB files
- 6GB: OS and browser reserve
- Total allocated: ~18GB, leaving 6GB headroom

### CPU Optimization

DuckDB uses all available CPU cores for column-parallel profiling. All statistical operations use NumPy vectorized operations. FastAPI's asyncio event loop ensures the WebSocket sender never blocks while pipeline runs in a background thread pool.

---

## 21. ERROR HANDLING & FALLBACKS

### LLM Failure Handling

If an agent's LLM call times out after 60 seconds, the system retries with a shortened prompt up to 3 times. After 3 failures, a rule-based fallback activates: column classification uses regex pattern matching and keyword lookup, compliance mapping defaults to SUPPRESS for all flagged columns, and the user is notified which columns used rule-based defaults. The pipeline continues rather than failing.

If the LLM returns malformed JSON, the system attempts extraction from markdown code blocks. If extraction fails, the prompt is retried with explicit JSON-only instruction. Pydantic validation catches structural errors and triggers retries before fallback activates.

### Data Processing Failures

Malformed CSVs are retried with alternative delimiters (tab, semicolon, pipe). If the file exceeds 1GB, a 50% random sample is taken with a visible user warning. Columns with more than 50% null values are automatically dropped with a warning log entry. If SDV fails to train on a column (all-identical values, unsupported type), that column is excluded from synthesis and the exclusion is recorded in the audit trail.

### Frontend Error Handling

React Error Boundaries wrap all major page sections. Disconnected WebSocket triggers automatic reconnection with exponential backoff (2s, 4s, 8s, 16s, 32s). If reconnection fails, frontend falls back to polling `/api/pipeline-status/{job_id}` every 5 seconds with a visible "Reconnecting..." indicator. Pipeline continues unaffected on the backend.

### Bias Audit Failures

If AIF360 cannot compute a metric for a specific column combination (too few samples in a group, constant outcome column), that specific metric is marked as "Insufficient data — n < 30" rather than failing the entire audit. The report notes which metrics were not computable and why.

---

## 22. PERFORMANCE OPTIMIZATION

### Backend Optimizations

Model quantization reduces Llama-3.1-8B from ~16GB FP16 to ~4.5GB 4-bit GGUF with less than 2% quality loss on classification tasks. Context length per agent is capped at 2,000 tokens. DuckDB processes all column statistics in a single parallel SQL pass. Statistical tests use NumPy vectorized operations throughout.

Data remains in memory across the entire pipeline, written to disk only at phase checkpoints.

### Frontend Optimizations

Heavy chart components (distribution comparison, correlation heatmap) are lazy-loaded via Next.js dynamic imports, only mounting on the results page. WebSocket log updates throttled to 10 UI updates per second. Chart data memoized — charts only re-render when their specific data slice changes. Bias findings cards are virtualized if count exceeds 20.

---

## 23. HACKATHON PITCH STRATEGY

### Target Hackathon Types (In Priority Order)

1. **HealthTech / MedTech competitions:** Hospital CIO or health AI founder judges. They understand HIPAA BAA friction and frozen AI projects immediately.
2. **FinTech / Regulatory Innovation events:** Bank compliance or fintech VC judges. They know GLBA pain and data governance audit delays.
3. **AI Safety / AI Ethics competitions:** Fairness researchers and policy researchers as judges. Lead with the Bias Audit module here.
4. **GovTech / Government Innovation challenges:** Data sovereignty and on-premise requirements are mandatory in this context — you are the only viable answer.
5. **General enterprise / B2B innovation hackathons:** Viable but harder — judges need to be educated on the pain before they feel it.

Do NOT pitch at: general developer/API hackathons (you'll be compared to Supabase), blockchain hackathons (wrong frame entirely), consumer app competitions (wrong buyer).

### The 5-Minute Pitch Structure

**Minute 0–1: The Pain (Show It, Don't Tell It)**
"A hospital in Mumbai wants to collaborate with IIT Bombay on an ML model for early diagnosis. IIT cannot sign a Business Associate Agreement — they are academic. The project dies. This happens to hundreds of AI projects every year — not because of fines, but because data cannot move." Show a real use case, one sentence, no jargon.

**Minute 1–2: The Blocker (Make It Visceral)**
"The CIO asks: 'Show our ethics board how patient data is anonymized.' If there is no answer, the AI project is frozen. The fintech asks the investor: 'How are you training models without leaking PII?' If the answer is 'carefully,' the funding round is delayed six months." These are the moments your customers have actually lived.

**Minute 2–4: The Demo (The Transformation)**
Upload the hiring dataset. Show the pipeline running. Show the approval interface with the specific HIPAA citation next to the SSN column — not a generic "PII detected" label, but the exact regulation. Show generation. Show the quality score. Show the compliance certificate PDF. End with: "This is what the hospital hands to their ethics board. The project unfreezes."

**Minute 4–5: The Credibility Close**
"We have [hospital name/fintech name] ready to pilot this. We have sponsor backing. Our target market is the on-premise regulated sector that Gretel.ai and Mostly AI deliberately did not serve because SaaS margins are better — but those customers pay $100K–$300K for compliance infrastructure and they pay reliably. We are not a cool demo. We are the compliance infrastructure layer for AI in regulated industries."

### Anticipated Judge Questions and Prepared Answers

**"Why hasn't Gretel done this already?"**
They're cloud-first because SaaS scales better. The on-premise regulated market is real but hard — long sales cycles, heavy customization, no self-serve growth. We go where they won't.

**"What stops a hospital from building this themselves?"**
SDV is open-source. But the compliance certification (SOC 2, HIPAA BAA agreements), legal liability for the certificate, and continuous compliance updates when GDPR changes are 12–18 months of work hospitals cannot do themselves. We sell the certification layer, not just the code.

**"The demo works on a clean CSV. What about real enterprise data?"**
V1 handles well-structured CSV and Parquet. Production versions handle schema drift, multi-encoding, and sparse datasets — that's an 18-month engineering roadmap we've already scoped. The hospital pilots are on structured datasets first, which is where every AI project starts.

**"Synthetic data underperforms real data for model training."**
On average 5–10% accuracy gap, which closes as model size increases. For the specific use cases we target — fraud detection patterns, patient readmission prediction, hiring model fairness testing — published research shows >90% of real-data performance. The statistical profile audit report we generate lets the customer see exactly how faithful the synthetic data is before they commit to training on it.

**"What's your moat?"**
In 6 months: none except execution speed and domain depth. At 18 months: the compliance certification track (HIPAA BAA + SOC 2), the first hospital customer references, and the exclusive pilot agreements. The moat is earned, not declared.

### Demo Dataset Specification

Use a 1,000-row hiring dataset. Columns: applicant_id, age, gender, race, education_level, years_experience, interview_score, hiring_decision.

This dataset triggers: multiple CRITICAL and HIGH bias findings in the optional Bias Audit (gender × hiring_decision DIR ≈ 0.61, race × hiring_decision DIR ≈ 0.58), clear PII in applicant_id, PHI-adjacent data in age. The audience understands hiring discrimination intuitively, making the findings immediately legible. The compliance certificate maps applicant_id to EEOC record-keeping requirements and age to ADEA protected class documentation.

### Demo Day Execution Rules

What must work without failure: file upload and preview, live log streaming visible to the audience, approval interface rendering all columns with specific regulation citations, download buttons producing non-empty real files.

What should work: all results dashboard charts, quality score gauge, PDF certificate rendering.

What can be deprioritized: perfect animation smoothness under load, about page content, advanced error recovery UI.

Pre-recorded backup: always have a 3-minute screen recording of the full pipeline completing successfully. If anything breaks live, transition to "let me show you what this looks like when it runs at full speed" — smoothly, without apology, without fumbling. Judges forgive demo glitches. They do not forgive panicked debugging.

---

## 24. PRE-FLIGHT SETUP & COLD START PROTOCOL

### System Prerequisites

Docker 24+ with NVIDIA Container Toolkit installed and configured, CUDA 12.1 drivers active (verifiable via `nvidia-smi`), Node.js 20+, Python 3.11+, at least 20GB free disk space (models consume ~8GB).

### Step 1 — Pull Ollama Models

One-time operation requiring internet. After completion, all inference is fully offline.

Models to pull:
- `llama3.1:8b-instruct-q4_K_M` — 4-bit quantized Llama 3.1 8B for Profiler and Compliance agents
- `phi3:mini-4k-instruct-q4_K_M` — 4-bit quantized Phi-3 Mini for Validation agent and all Bias Audit agents

After pulling, verify each model responds to a test prompt before proceeding.

### Step 2 — Python Dependency Installation

All dependencies install into the Docker container during build. Requirements: FastAPI, Uvicorn, LangGraph, LangChain-Community (Ollama integration), ChromaDB, sentence-transformers (all-MiniLM-L6-v2 embedding model, ~90MB auto-download on first run), SDV, SDMetrics, Diffprivlib, AIF360, DuckDB, Pandas, NumPy, SciPy, Pydantic, python-multipart, ReportLab.

### Step 3 — ChromaDB Knowledge Base Seeding

Most critical cold-start step. Seeding script reads Markdown files from `/knowledge_base/`, chunks at 512 tokens with 50-token overlap, generates embeddings using all-MiniLM-L6-v2, writes to persistent ChromaDB collection at `/data/chromadb/`.

Files processed in order: `hipaa_safe_harbor.md`, `gdpr_special_categories.md`, `glba_financial_privacy.md`, `fairness_legal_thresholds.md`, `domain_constraints_library.md`.

Post-seeding verification: query "SSN safe harbor rule" and confirm at least 3 chunks returned with similarity scores above 0.75. Query "Disparate Impact Ratio legal threshold" and confirm at least 2 chunks returned with similarity above 0.70. If either check fails, re-seed before starting the API server.

ChromaDB collection is persistent — seeding runs only once. Subsequent starts skip this step entirely.

### Step 4 — Directory Initialization

Directories required with write permissions: `/tmp/fairsynth/` (job working directories), `/tmp/fairsynth/bias/` (bias audit working directories), `/data/chromadb/` (vector database persistence), `/data/outputs/` (final export files).

### Step 5 — Pre-Start Health Check

Verifies: Ollama running with both models responding to test prompts, ChromaDB collection contains at least 100 embedded chunks, all required directories exist with write permissions, GPU accessible via CUDA. All checks must pass before API server starts. Failed checks print specific, actionable error messages rather than generic failures.

### Cold Start Estimated Time

Model pulls: 10–15 minutes for ~8GB total. Dependency installation: 3–5 minutes. ChromaDB seeding: 2–3 minutes. Health checks: 30 seconds. Total first-time setup: ~15–20 minutes. All subsequent starts: under 60 seconds.

---

## 25. DATA DESTRUCTION & EPHEMERALITY PROTOCOL

### The Privacy Irony Problem

A platform whose pitch is strict on-premise data privacy cannot leave sensitive raw files in a `/tmp/` directory after job completion. If the system crashes, the machine is seized, or another process has read access to `/tmp/`, the original sensitive data is exposed. This section defines the mandatory destruction protocol.

### Destruction Trigger Points

**Trigger 1 — Successful Download Acknowledgement:** When the user clicks any download button, the frontend sends `POST /api/acknowledge-download/{job_id}`. The backend records the download timestamp and schedules a destruction task 60 seconds later. The delay allows downloading all files before destruction.

**Trigger 2 — Session Expiry:** If a completed job has not been downloaded within 2 hours of pipeline completion, an automated cleanup scheduler triggers destruction.

**Trigger 3 — Pipeline Failure:** If the pipeline fails at any phase, the raw upload and all intermediate files created up to that point are destroyed immediately. No partial retention. The audit log entry in DuckDB is preserved (contains no raw data — only metadata and scores), but all files on disk are purged.

**Trigger 4 — Bias Audit Completion:** The bias audit input file copy is destroyed immediately after the audit completes and the findings JSON is generated. The bias audit does not need the raw data after metric computation — findings are statistical summaries, not data excerpts.

### What Gets Destroyed

Everything in `/tmp/fairsynth/{job_id}/` except the DuckDB audit log metadata: raw_upload.csv, profiled_schema.json (contains sample values from real data), compliance_plan.json, approval_payload.json, synthetic_data.parquet, validation_report.json, and all files in the `outputs/` subdirectory. The outputs are cleaned after download acknowledgement — they contain no raw data but are removed for hygiene.

Bias audit: everything in `/tmp/fairsynth/bias/{audit_id}/` including audit_input.csv and bias_findings.json intermediate files. The final report PDFs are cleaned after download acknowledgement.

### Secure Deletion Method

Standard `os.remove()` is insufficient — it only removes the file system pointer. The destruction routine uses a three-pass overwrite before deletion: first pass writes all zeros, second pass writes all ones, third pass writes random bytes, then the file is deleted. This makes recovery with standard forensic tools infeasible.

For Docker deployment: the entire job directory is a Docker volume mount that is explicitly removed via the Docker API after destruction, ensuring the underlying storage layer clears the allocation.

### Destruction Audit Trail

Every destruction event is logged in DuckDB's `audit_destruction_log` table: job_id, destruction trigger type, destruction timestamp, list of files destroyed, checksum-null confirmation. This log is retained permanently even after data is gone — it is the evidence that the system honored its privacy promise, and the compliance certificate references this destruction timestamp.

### What Is Never Destroyed

DuckDB audit log metadata rows are retained permanently — they contain only filenames, timestamps, quality scores, and bias metrics, not actual data values. The ChromaDB knowledge base is never destroyed — it contains only legal text, not user data.

---

## 26. RAG KNOWLEDGE BASE STRUCTURE

### Why Format Matters for Retrieval Quality

Feeding raw legal PDFs into a text chunker destroys RAG retrieval quality. A PDF of the HIPAA Privacy Rule is 115 pages of cross-referenced legal prose. Naive chunking produces fragments with no semantic value for queries like "what must I do with a Social Security Number." The knowledge base must be pre-processed into structured, queryable Markdown before embedding.

### Required Knowledge Base Files

Five Markdown files in `/knowledge_base/`. Each follows a strict format: rule identifier, plain-English name, required action, applicable column patterns, and exact regulatory citation. This format ensures that when a retrieval query arrives for "SSN column, healthcare dataset", the returned chunk contains the action, not just legal prose.

### File 1 — hipaa_safe_harbor.md

18 individual rule entries for the 18 identifiers in HIPAA Safe Harbor de-identification standard §164.514(b)(2). Each entry: rule ID (e.g., HIPAA-SH-04), identifier name (e.g., "Social Security Numbers"), required action (SUPPRESS / GENERALIZE / PSEUDONYMIZE), column pattern keywords (ssn, social_security, tax_id, social_security_number), and exact citation. The 18 identifiers: names, geographic data smaller than state, dates except year for ages over 89, phone numbers, fax numbers, email addresses, SSNs, medical record numbers, health plan beneficiary numbers, account numbers, certificate and license numbers, vehicle identifiers, device identifiers and serial numbers, URLs, IP addresses, biometric identifiers, full-face photographs, and any other unique identifying code.

### File 2 — gdpr_special_categories.md

GDPR Article 9 special categories: racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data for identification, health data, sex life or sexual orientation. Each entry: required action (SUPPRESS or EXPLICIT_CONSENT_REQUIRED), column patterns, Article 9 citation. Second section: GDPR Article 17 (right to erasure) mapped to the Data Destruction Protocol.

### File 3 — glba_financial_privacy.md

GLBA financial privacy requirements: customer account numbers, SSNs in financial context, credit scores, transaction history patterns, income data, loan decision fields. Each entry: required action, column patterns, GLBA citation. Special entry: Safeguards Rule requirement that all nonpublic personal information (NPI) must be protected at rest — mapped to the Data Destruction Protocol.

### File 4 — fairness_legal_thresholds.md

Legal and regulatory thresholds for fairness metrics. Entries: EEOC 80% rule (DIR threshold of 0.8 for employment), Fair Housing Act protected classes, Equal Credit Opportunity Act protected attributes for lending, ADA-related considerations for healthcare datasets. Each entry: metric name, legal threshold value, consequence of violation, regulatory body that enforces it. This is what allows the Bias Interpreter Agent to classify findings as CRITICAL/HIGH/MEDIUM rather than just reporting numbers.

### File 5 — domain_constraints_library.md

Domain-specific logical constraints for data consistency validation during profiling. Sections: medical domain (valid ICD-10 code format patterns, discharge date after admission date, age range 0–150, valid vital sign ranges), financial domain (credit score range 300–850, interest rate range 0–100%, loan amount must be positive), HR domain (employment start date before end date, salary must be positive, age must be 18+ for employment records). Used during profiling to catch constraint violations before synthesis.

### Embedding Strategy

Each file chunked at 512 tokens with 50-token overlap. Overlap ensures rule entries spanning a chunk boundary are not split in a way that separates the action from the column pattern. Metadata tags stored per chunk: source file name, rule ID (if applicable), category (PRIVACY / FAIRNESS / CONSTRAINT). During retrieval, metadata filtering allows category-specific queries — compliance queries only retrieve PRIVACY chunks, bias audit queries only retrieve FAIRNESS chunks.

---

## 27. TEAM RESPONSIBILITIES MATRIX

### Division of Labor for a Three-Person Team

Strict ownership boundaries prevent merge conflicts, duplicated effort, and last-minute integration surprises. This matrix defines ownership — not suggestions.

### Person A — Frontend & UX Engineer

Owns the entire Next.js application, all Tailwind styling, all Framer Motion animations, Zustand state management, WebSocket client manager, and every UI component in Section 16. Also owns the Bias Audit page components and the `BiasAudit` Zustand slice.

Person A defines what data shapes they need from each endpoint and communicates these to Person B before Person B builds the endpoints. Person A does not touch any Python files.

Deliverables in priority order: Upload page with drag-and-drop and preview, Pipeline monitoring page with progress rail and log panel, Approval interface modal, Results dashboard with download panel, Bias Audit page with confirmation modal and findings cards. Landing page is lowest priority — a simple static page if time is short.

### Person B — Backend & Data Pipeline Engineer

Owns the FastAPI application, all API endpoints (both core pipeline and bias audit), DuckDB schema and queries, file storage layout, SDV synthetic generation logic, Diffprivlib privacy layer, SDMetrics validation logic, data destruction protocol, and PDF certificate generation (ReportLab). Owns the Bias Audit download endpoints and the bias_findings.json → bias_audit_report.pdf generation.

Person B defines the WebSocket event schema that both Person A (consumer) and Person C (producer) must conform to. Person B does not build agents or write LangGraph graph definitions. If the orchestrator needs to call a statistical function, Person B exposes it as an importable Python function.

Deliverables in priority order: file upload endpoint and DuckDB job tracking, WebSocket event streaming infrastructure for both pipeline and bias audit channels, synthetic generation pipeline (SDV + Diffprivlib), quality scoring and validation, download endpoints, data destruction routine, PDF certificate generation, bias audit results endpoints.

### Person C — AI & Agent Orchestration Engineer

Owns the LangGraph Core Pipeline graph definition, LangGraph Bias Audit graph definition, all agent prompt designs (5 total across both graphs), Ollama integration, ChromaDB seeding script and retrieval logic, AIF360 bias metric computation, VRAM management protocol (sequential model loading/unloading), and cold-start initialization scripts.

Person C is responsible for all five knowledge base Markdown files in Section 26 — these must be completed first as nothing works without them.

Person C does not write frontend components or API endpoint handlers. Agent outputs are structured JSON conforming to schemas defined collaboratively — Person C produces them, Person B consumes them.

Deliverables in priority order: ChromaDB seeding script and all five knowledge base files (must be done first), Profiler Agent (Agent 1), RAG Compliance Agent (Agent 2), Validation Reporter Agent (Agent 3), Bias Profiler Agent (Bias Agent 1), Bias Metrics Executor (Bias Agent 2), Bias Interpreter Agent (Bias Agent 3). The pipeline pause/resume mechanism connecting to Person B's approval endpoint must be integrated at the same time as Agent 2 completion.

### Shared Responsibilities

Docker Compose configuration and environment variable schema are owned jointly. The API contract (endpoint paths, request/response shapes, WebSocket event formats for both channels) is a shared document all three persons must agree on before integration work begins.

### Integration Checkpoints

Three explicit checkpoints must be scheduled during build time.

**Checkpoint 1:** File upload from the frontend correctly creates a DuckDB job record and returns a job_id with column preview. No agents need to be complete for this checkpoint.

**Checkpoint 2:** Manually triggered pipeline emits WebSocket events that appear correctly formatted in the frontend log panel. Approval modal appears and submitting it sends the correct payload to Person B's endpoint.

**Checkpoint 3:** Full end-to-end run of the demo dataset — from upload to certificate download — with all three persons present. The synthetic CSV must be non-empty, the quality score must appear in the gauge, and the PDF certificate must be downloadable and readable. This is the final integration test. If anything breaks here, it breaks on stage.

---

*This document is the complete blueprint for FairSynth AI v2.0. The core architectural change from v1: bias detection is a standalone optional module, not a mandatory pipeline phase. The core pipeline is now a 6-phase privacy and compliance workflow. The Bias Audit module is an independent service with its own LangGraph graph, agent set, API routes, WebSocket channel, and output format. Every component, data flow, UI element, agent interaction, security protocol, and team responsibility is specified here. Implementation follows this document section by section.*
