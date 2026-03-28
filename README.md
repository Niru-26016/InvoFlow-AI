# InvoFlow AI — Automated Invoice Financing Platform

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?style=flat-square&logo=firebase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

InvoFlow AI is an end-to-end, multi-agent digital invoice financing solution designed to bridge the trust and cashflow gap between **MSMEs** (Micro, Small, and Medium Enterprises), **Corporate Buyers**, and **Funders**. By leveraging AI-driven extraction, deterministic risk scoring, and a simulated blockchain ledger, it provides a transparent and efficient marketplace for receivables.

---

## ✨ Key Features

*   🤖 **AI-Powered Invoice Extraction** — GPT-4o Vision parses PDF/image invoices and extracts structured data with strict identity validation.
*   📊 **Deterministic Risk Scoring** — Multi-factor algorithm grades invoices from A+ to D for transparent, explainable risk assessment.
*   🔗 **Blockchain Ledger Simulation** — Every lifecycle event is hashed into an immutable, tamper-evident chain (SHA-256).
*   💸 **Competitive Bidding Marketplace** — Funders bid discount rates; MSMEs accept the best offer based on risk appetite matching.
*   🔒 **Escrow & Settlement** — Simulated escrow flow secures funds between funder and MSME with full audit trail.
*   🌐 **Multi-Language Support** — Full UI localization in 6 languages (English, Hindi, Tamil, Telugu, Kannada, Malayalam).
*   🔐 **Role-Based Access** — Three distinct portals: MSME, Buyer, and Funder, each with tailored dashboards and workflows.

---

## 🚀 Multi-Agent Workflow

The platform operates through a series of specialized agent stages that ensure the integrity of every transaction:

1.  **AI Extraction & Verification Agent**
    *   Powered by `gpt-4o` Vision API for high-accuracy document parsing.
    *   Automatically extracts Buyer/Seller details, Invoice Number, Amount, and Due Date from uploaded PDF or image files.
    *   **Strict Identity Check**: Cross-references seller details on the invoice with the registered MSME profile using fuzzy name matching and exact GSTIN validation.

2.  **Buyer Confirmation Agent**
    *   Invoices are routed to the Buyer for digital confirmation.
    *   Buyers verify that the goods/services were received and the invoice is authentic before it proceeds to funding.

3.  **Deterministic Risk Agent**
    *   Runs a multi-factor scoring algorithm to grade the invoice (A+ to D).
    *   **Scoring Factors**: Buyer Credit Score (40%), Payment History (20%), Avg Payment Days (15%), Invoice Amount (10%), Due Date Proximity (10%), GSTIN Validation (5%).

4.  **Bidding & Matching Agent**
    *   Verified invoices are listed for Funders filtered by their **Risk Appetite** (`LOW`, `MEDIUM`, `HIGH`).
    *   Funders place competitive discount rate bids. MSMEs can review and accept the best offer.

5.  **Escrow & Settlement Agent**
    *   A simulated escrow system handles the flow of funds from Funder to MSME.
    *   Integrates with the **Blockchain Ledger** to log every lifecycle event immutably.

---

## 🛡️ Blockchain Ledger Simulation

Every critical action is logged to an immutable, transparent ledger powered by `crypto-js`:

| Property | Detail |
|---|---|
| **Integrity** | Each block contains a SHA-256 hash of its data and the previous block's hash |
| **Verification** | Built-in chain integrity checks detect any data tampering or broken links |
| **Events Logged** | Uploads, AI Verifications, Buyer Confirmations, Funder Bids, Escrow Deposits, Final Settlements |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Lucide React, Recharts |
| **Backend** | Node.js, Express 4 (AI orchestration & PDF parsing) |
| **Database & Auth** | Google Firebase (Firestore, Authentication) |
| **AI** | OpenAI GPT-4o Vision API (`openai` SDK v6) |
| **Blockchain** | `crypto-js` SHA-256 (client-side simulation) |
| **Localization** | `i18next` + `react-i18next` (6 languages) |
| **PDF Parsing** | `pdf-parse` (server-side) |

---

## 📦 Project Structure

```text
InvoFlow-AI/
├── index.html                  # App entry point
├── vite.config.js              # Vite configuration
├── .env.example                # Environment variable template
├── install.bat                 # Windows quick-install script
│
├── src/
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx                # React DOM entry
│   ├── index.css               # Global styles (Tailwind)
│   ├── i18n.js                 # i18next initialization
│   ├── assets/                 # Static assets (images, SVGs)
│   ├── components/
│   │   ├── AgentStatusTracker.jsx  # Real-time agent progress UI
│   │   ├── Layout.jsx              # Shared navigation shell
│   │   ├── ProtectedRoute.jsx      # Auth-guard wrapper
│   │   ├── StatCard.jsx            # KPI stat card
│   │   └── StatusBadge.jsx         # Invoice status pill
│   ├── config/
│   │   └── firebase.js         # Firebase SDK initialization
│   ├── contexts/
│   │   ├── AuthContext.jsx     # Firebase auth state
│   │   └── NotificationContext.jsx # Toast notifications
│   ├── locales/                # Translation JSON files
│   │   ├── en.json  hi.json  ta.json
│   │   ├── te.json  kn.json  ml.json
│   ├── pages/
│   │   ├── Login.jsx           # Login page
│   │   ├── Register.jsx        # Registration (MSME / Buyer / Funder)
│   │   ├── BlockchainLedger.jsx # Public ledger explorer
│   │   ├── msme/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UploadInvoice.jsx
│   │   │   ├── VerificationStatus.jsx
│   │   │   ├── FundingOffers.jsx
│   │   │   └── ReceiveMoney.jsx
│   │   ├── buyer/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ConfirmInvoice.jsx
│   │   │   ├── MakePayment.jsx
│   │   │   └── TrackFinancing.jsx
│   │   └── funder/
│   │       ├── Dashboard.jsx
│   │       ├── AvailableInvoices.jsx
│   │       ├── RiskScores.jsx
│   │       └── PortfolioPerformance.jsx
│   └── services/
│       └── blockchainService.js  # SHA-256 chain logic
│
└── server/
    ├── index.js                # Express server entry point
    └── package.json            # Server-side dependencies
```

---

## 🚦 Getting Started

### Prerequisites

*   Node.js **v18+**
*   A [Firebase](https://console.firebase.google.com/) project with **Firestore** and **Authentication** enabled
*   An [OpenAI](https://platform.openai.com/) API key with access to `gpt-4o`

### 1 — Clone & Install

```bash
# Clone the repository
git clone https://github.com/Niru-26016/InvoFlow-AI.git
cd InvoFlow-AI

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

> **Windows shortcut**: double-click `install.bat` to install both sets of dependencies automatically.

### 2 — Configure Environment Variables

Create two `.env` files based on `.env.example`:

**Root `.env`** (frontend):
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_URL=http://localhost:5000
```

**`server/.env`** (backend):
```env
OPENAI_API_KEY=your_openai_key_here
```

### 3 — Run in Development

```bash
# Terminal 1 — Frontend (Vite dev server, default: http://localhost:5173)
npm run dev

# Terminal 2 — Backend (Express server, default: http://localhost:5000)
cd server && npm run dev
```

### 4 — Available Scripts

| Command | Location | Description |
|---|---|---|
| `npm run dev` | root | Start Vite frontend dev server |
| `npm run build` | root | Build frontend for production |
| `npm run preview` | root | Preview production build locally |
| `npm run lint` | root | Run ESLint on the source |
| `npm run dev` | `server/` | Start Express backend with hot-reload |
| `npm start` | `server/` | Start Express backend (production) |

---

## 🔐 Platform Roles

### 🏭 MSME
Uploads invoices, tracks AI verification in real-time via the Agent Status Tracker, and accepts the lowest-rate funding offer from competing funders. Once funded, receives the disbursed amount directly.

### 🛒 Buyer
Manages supplier relations by reviewing and confirming valid invoices. Makes payments into the escrow account and can track the financing status of all linked invoices.

### 💼 Funder
Deploys capital based on a configured risk appetite (`LOW` / `MEDIUM` / `HIGH`). Browses verified, risk-graded invoices, places competitive discount bids, and monitors portfolio performance and returns.

---

## 🌐 Supported Languages

| Code | Language |
|---|---|
| `en` | 🇬🇧 English |
| `hi` | 🇮🇳 Hindi |
| `ta` | 🇮🇳 Tamil |
| `te` | 🇮🇳 Telugu |
| `kn` | 🇮🇳 Kannada |
| `ml` | 🇮🇳 Malayalam |

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss your idea before submitting a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
