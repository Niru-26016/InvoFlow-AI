# InvoFlow AI — Automated Invoice Financing Platform

InvoFlow AI is an end-to-end, multi-agent digital invoice financing solution designed to bridge the trust and cashflow gap between MSMEs (Micro, Small, and Medium Enterprises), Corporate Buyers, and Funders. By leveraging AI-driven extraction, deterministic risk scoring, and a simulated blockchain ledger, it provides a transparent and efficient marketplace for receivables.

## 🚀 Multi-Agent Workflow

The platform operates through a series of specialized agent stages that ensure the integrity of every transaction:

1.  **AI Extraction & Verification Agent**: 
    *   Powered by `gpt-4o` for high-accuracy document parsing.
    *   Automatically extracts Buyer/Seller details, Invoice Number, Amount, and Due Date.
    *   **Strict Identity Check**: Cross-references the seller details on the invoice with the registered MSME profile using fuzzy name matching and exact GSTIN validation.
2.  **Buyer Confirmation Agent**:
    *   Invoices are routed to the Buyer for digital confirmation.
    *   Buyers verify that the goods/services were received and the invoice is authentic.
3.  **Deterministic Risk Agent**:
    *   Runs a multi-factor scoring algorithm to grade the invoice (A+ to D).
    *   **Factors**: Buyer Credit Score (40%), Payment History (20%), Avg Payment Days (15%), Invoice Amount (10%), Due Date Proximity (10%), and GSTIN Validation (5%).
4.  **Bidding & Matching Agent**:
    *   Verified invoices are listed for Funders based on their **Risk Appetite** (`LOW`, `MEDIUM`, `HIGH`).
    *   Funders place competitive discount bids. MSMEs can accept the best offer.
5.  **Escrow & Settlement Agent**:
    *   Simulated escrow system handles the flow of funds from Funder to MSME.
    *   Integrates with a **Blockchain Ledger** to log every lifecycle event.

## 🛡️ Blockchain Ledger Simulation

Every critical action is logged to an immutable, transparent ledger:
*   **Integrity**: Each block contains a SHA-256 hash of its data and the previous block's hash.
*   **Verification**: Built-in chain integrity checks detect any data tampering or broken links.
*   **Events Logged**: Uploads, AI Verifications, Buyer Confirmations, Funder Bids, Escrow Deposits, and Final Settlements.

## 🛠️ Technology Stack

*   **Frontend**: React 19 (Vite), Tailwind CSS v4, Lucide React, Recharts
*   **Backend**: Node.js, Express (AI orchestration & PDF parsing)
*   **Database & Auth**: Google Firebase (Firestore, Authentication, Cloud Functions-ready)
*   **AI Integrations**: OpenAI GPT-4o Vision API
*   **Localization**: `i18next` with support for 6 languages: 🇬🇧 English, 🇮🇳 Hindi, 🇮🇳 Tamil, 🇮🇳 Telugu, 🇮🇳 Kannada, and 🇮🇳 Malayalam.

## 📦 Project Structure

```text
├── src/
│   ├── components/       # Reusable UI (StatusBadges, Trackers, Layouts)
│   ├── contexts/         # Auth and Notification state management
│   ├── locales/          # Translation files (en, hi, ta, te, kn, ml)
│   ├── pages/            # Role-specific dashboards (MSME, Buyer, Funder)
│   ├── services/         # Blockchain logic and API services
│   └── i18n.js           # Internationalization configuration
└── server/
    ├── routes/           # AI Agent endpoints (OpenAI proxy)
    └── index.js          # Express server entry point
```

## 🚦 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Firebase Project (Firestore + Auth)
*   OpenAI API Key

### Setup Instructions

1.  **Clone & Install:**
    ```bash
    git clone https://github.com/Niru-26016/invoflow-ai.git
    npm install
    cd server && npm install
    ```

2.  **Environment Variables:**
    *   **Root (.env)**: `VITE_BACKEND_URL=http://localhost:5000` + Firebase Config (`VITE_FIREBASE_API_KEY`, etc.)
    *   **Server (.env)**: `OPENAI_API_KEY=your_key_here`

3.  **Run Development:**
    ```bash
    # Root folder (Frontend)
    npm run dev
    
    # Server folder (Backend)
    npm run dev
    ```

## 🔐 Platform Roles

*   **MSME**: Uploads invoices, tracks AI verification in real-time, and accepts the lowest-rate funding offers.
*   **Buyer**: Manages supplier relations by confirming valid invoices and settling payments into escrow.
*   **Funder**: Deploys capital based on risk appetite, bids on verified invoices, and earns a return upon settlement.
