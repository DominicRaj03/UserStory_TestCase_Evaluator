# QA AI Agent Workbench - Comprehensive Functional & Technical Document

## 1. Executive Summary

The **QA AI Agent Workbench** is an autonomous, agent-driven platform designed to streamline the Agile and Quality Assurance lifecycle. Evolved from a static evaluator into an **Agentic System**, the application doesn't just score artifacts—it autonomously refines them, conducts multi-perspective audits, and collaborates with users to achieve "Gold Standard" requirements and test cases.

---

## 2. Functional Architecture & Features

### 2.1. Agentic AI Capabilities (NEW)
The system now features an **Autonomous Agent Layer** that provides three core high-impact capabilities:
- **✨ Autonomous Refinement Agent**: If an artifact (User Story or Test Case) scores poorly, the agent proactively generates a "Fixed Version." It analyzes evaluation findings and rewrites the content to address gaps in clarity, testability, or business value.
- **🕵️ Multi-Agent Perspective Review**: Orchestrates a "Digital Board of Review" where three specialized agents (Product Owner, QA Lead, and Security Analyst) debate the artifact. This ensures a rounded, multi-dimensional quality check that a single LLM call cannot achieve.
- **💬 Collaborative "Why?" Assistant**: A context-aware chat interface that allows users to interrogate the evaluation results. Users can ask follow-up questions, request specific examples, or get coaching on how to improve their writing.

### 2.2. Generator Workflow
- **User Story Generator**: Decomposes Epics into formatted stories with Story Points and Acceptance Criteria.
- **Test Case Generator**: 
  - **From Feature**: Generates comprehensive suites (Positive, Negative, Edge cases).
  - **From UI Mockup**: Translates UI descriptions into logical functional test scenarios.

### 2.3. Evaluator & Audit Workflow
- **INVEST Evaluator**: Scores user stories against Independent, Negotiable, Valuable, Estimable, Small, and Testable criteria.
- **QA Metric Evaluator**: Analyzes test cases for Clarity, Traceability, Accuracy, and Coverage.
- **Bulk Processor**: Batch evaluates dozens of items via XLSX/CSV upload with aggregated reporting.

### 2.4. Analytics & Integration
- **ROI Dashboard**: Visualizes time saved, quality trends, and cost efficiency of AI vs. manual effort.
- **Jira/Azure Integration**: Directly imports and pre-evaluates backlog items from external ALM tools.

---

## 3. Technical Implementation

### 3.1. Tech Stack
- **Frontend**: React 19, Vanilla CSS (Premium Aesthetics), Recharts, SheetJS.
- **Backend**: Node.js / Express.js (Stateless API).
- **LLM Engine**: Groq SDK (`llama-3.1-8b-instant`) for high-speed, high-quality reasoning.
- **Vector DB (RAG)**: Pinecone + HuggingFace Embeddings for project-specific context.
- **Observability**: Langfuse for full-trace agentic reasoning visibility.
- **Hosting**: 
  - **Frontend**: Firebase Hosting ([qa-evaluator-4557f.web.app](https://qa-evaluator-4557f.web.app))
  - **Backend**: Vercel Serverless ([evaluator-production.vercel.app](https://evaluator-production.vercel.app))

### 3.2. Agentic Logic (AgenticEngine.js)
The agentic layer is implemented as a specialized utility that manages:
1. **Self-Correction Loop**: A recursive-style prompt that feeds "Findings" back into the generator to produce the "Refined Version."
2. **Role Orchestration**: System prompts that force the LLM into distinct personas (PO/QA/SEC) to generate non-overlapping critical feedback.
3. **Conversational Memory**: A stateless chat handler that reconstructs the current evaluation context for the collaborative sidebar.

### 3.3. RAG & Quality Pipeline
- **Retrieval**: Queries Pinecone for the top 3 most relevant high-quality examples to "calibrate" the agent's expectations.
- **JSON Guardrails**: A custom `jsonRepair.js` utility ensures that even complex multi-agent responses are valid JSON before reaching the UI.
- **DeepEval (Mock)**: Optional secondary validation layer for hallucination and correctness checks.

---

## 4. API Specification (Agentic Extension)

### `POST /agentic/refine`
- **Purpose**: Generates a corrected version of a low-scoring artifact.
- **Input**: `{ artifact, type, findings, grade }`
- **Output**: `{ refinedContent, improvementsMade, estimatedNewGrade }`

### `POST /agentic/multi-agent-eval`
- **Purpose**: Triggers a 3-agent review panel.
- **Input**: `{ artifact, type }`
- **Output**: `{ poReview, qaReview, secReview, consensus }`

### `POST /agentic/chat`
- **Purpose**: Handles conversational context for the collaborative sidebar.
- **Input**: `{ artifact, type, evaluation, userQuestion }`
- **Output**: `{ response }`

---

## 5. Security & Observability
- **Token Masking**: All sensitive keys (Groq, Pinecone, Langfuse) are handled via Vercel Environment Variables.
- **Traceability**: Every agentic decision is logged to Langfuse, allowing developers to see the "hidden" prompts that drove the refinement or review.

---

## 6. Future Roadmap
- **Proactive Sync Agent**: Directly pushing refined stories back to Jira/Azure.
- **Multi-File Consistency Agent**: Auditing dependencies between different user stories in a single batch.
- **Voice-to-Story**: Agentic refinement of voice-transcribed requirements.
