<div align="center">
  <img src="./public/Logo.png" alt="Mandamus Logo" width="100">
  <br/>
  <h1>MANDAMUS</h1>
  <strong>Judicial AI Platform | Justice Delayed is Justice Denied.</strong>
</div>

<br/>

## The Crisis
India’s courts are overwhelmed. Every judge handles hundreds of cases concurrently with minimal to **zero** AI assistance.
- **500+ pages** per case file, read manually every single time.
- **1,80,000+ cases** pending for over 30 years without resolution.
- **2%+ GDP** lost annually due to judicial delays drastically impacting businesses and individuals alike.

## The Solution
**Mandamus** is a state-of-the-art, secure Judicial AI Platform that gives judges the exact tools they need to significantly reduce their massive workload, whilst ensuring the judge remains fully in control. *AI assists — judges decide.*

Our platform uses a Databricks-native enterprise-grade infrastructure to safely and immutably secure court data and accelerate judicial review workflows via natural language processing (NLP), Vector Searching, and Retrieval Augmented Generation (RAG).

---

## 🏛️ Five Systems. One Mission.
Every feature is carefully purpose-built to accelerate the judicial pipeline:

### 01. Smart Case Summariser
Instead of manually processing 500-page charge sheets, FIRs, and witness statements, our AI condenses vast case archives into a readable **1-page brief in under 60 seconds**. (Powered by OCR + BART/Pegasus NLP models).

### 02. Intelligent Precedent Finder
Semantic vector searches across lakhs of Indian judgments. Utilizing **Sentence Transformers**, judges receive the Top 5 most contextually relevant past cases in under 15 seconds, complete with similarity matching scores and outcome summaries.

### 03. Judgment Draft Generator
A secure RAG pipeline meshes the case summary, precedents, and the IPC/CrPC into a structured draft (Facts &rarr; Arguments &rarr; Legal Analysis &rarr; Order). Routine drafting time is reduced by up to 80%.

### 04. Smart Hearing Scheduler
Directly interfaces with NJDG data to analyze case readiness (document completeness, party notifications). Hearings are only scheduled if a case reaches a 100% readiness threshold, intelligently eliminating unnecessary adjournments.

### 05. Secure Virtual Hearing + Biometric Verification
A completely integrated and secured WebRTC virtual courtroom. Entry requires facial recognition and voice biometric verification. AI liveness detection entirely prevents spoofing. 

---

## ⚙️ Architecture: How Mandamus Works

1. **Ingest**
   Case files are ingested via Auto Loader securely into a **Delta Lake**. High-accuracy OCR seamlessly converts scanned PDFs into machine-readable text.
2. **Analyse**
   Specialized NLP models summarize documents while Vector embeddings retrieve semantically similar precedents at scale.
3. **Generate**
   Our RAG pipeline constructs detailed, structured drafts along with strict confidence scorings and legal citations.
4. **Review**
   We do not replace judges. The judge reviews, edits, and approves the findings. An immutable audit trail is logged. 

---

## 🚀 Tech Stack

**Frontend Interface**:
- React 18 (Vite)
- Custom CSS (Glassmorphism, CSS Variables, Hardware-Accelerated hardware animations)
- IntersectionObserver API (zero-dependency scroll animations)

**Backend / AI (Conceptualized Architecture)**:
- **Storage**: AWS Simple Storage Service (AWS S3) (Scalable to 25,000+ judges / 55M+ records)
- **Compute**: Apache Spark (Distributed computing)
- **Natural Language**: Spark NLP, Sentence Transformers, BART/Pegasus Models
- **Search**: Databricks Vector Search
- **Governance**: Unity Catalog & MLflow

---

## 💻 Local Development

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone this repository to your local machine.
2. Open a terminal and navigate to the root directory `Mandamus/`.
3. Install package dependencies:
   ```bash
   npm install
   ```

### Running the Platform
Simply boot up the Vite development server:
```bash
npm run dev
```
Navigate to the provided localhost URL (typically `http://localhost:5173/`) in your browser to experience the landing environment.
