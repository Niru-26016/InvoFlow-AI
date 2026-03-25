# InvoFlow AI — Automated Invoice Financing Platform

InvoFlow AI is an end-to-end, multi-agent digital invoice financing solution designed to bridge the trust and cashflow gap between MSMEs (Micro, Small, and Medium Enterprises), Corporate Buyers, and Funders.

## 🚀 Key Features

*   **Native AI Extraction**: Automated parsing of PDF/Image invoices using `gpt-4o` document analysis via the backend agent pipeline, eliminating manual data entry.
*   **Buyer-Confirmed Workflow**: MSMEs upload invoices; Buyers confirm authenticity, triggering the risk assessment pipeline to ensure data integrity.
*   **Custom Risk Scoring Engine**: A deterministic algorithm evaluates buyer credit, payment history, and invoice data to assign a dynamic risk score.
*   **Competitive Funder Bidding System**:
    *   Funders filter invoices based on their custom Risk Appetite (`HIGH`, `MEDIUM`, `LOW`).
    *   Funders bid competitive discount percentages on verified invoices.
    *   MSMEs view a real-time payout preview (calculated amount to receive after discount).
    *   MSMEs can accept the lowest rate (best deal) from a sorted list of funder bids.
*   **Dynamic Hexaware-Inspired Theme**: A professional, corporate design system featuring a vibrant electric blue primary palette, clean white/navy backgrounds, and a persistent Light/Dark mode toggle (saved via `localStorage`).

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Tailwind CSS v4
*   **Backend**: Node.js, Express (OpenAI API proxying & Agent Logic)
*   **Database & Auth**: Google Firebase (Firestore, Authentication)
*   **AI Integrations**: OpenAI GPT-4o (`/api/agents/analyze`)

## 📦 Project Structure

*   `/src`: React frontend, containing role-based dashboards (MSME, Buyer, Funder), reusable components (StatCards, StatusBadges, Layout), and contexts (AuthContext).
*   `/server`: Express backend containing the AI agent workflow orchestration for document parsing.

## 🚦 Getting Started

### Prerequisites
*   Node.js (v18+ recommended)
*   A Firebase project with Firestore and Authentication enabled.
*   An OpenAI API key.

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/invoflow-ai.git
    cd invoflow-ai
    ```

2.  **Environment Variables:**
    *   **Frontend**: Create a `.env` in the root folder with your Firebase configuration.
    *   **Backend**: Create a `.env` in the `/server` folder containing your `OPENAI_API_KEY`.

3.  **Install Dependencies:**
    ```bash
    # Install frontend dependencies
    npm install

    # Install backend dependencies
    cd server
    npm install
    cd ..
    ```

4.  **Run Development Servers:**
    Run both the frontend and backend servers simultaneously:
    ```bash
    # Open two terminal windows/tabs:
    
    # Terminal 1 (Frontend)
    npm run dev
    
    # Terminal 2 (Backend)
    cd server
    npm run dev
    ```

5.  **Access the Application:**
    Navigate to `http://localhost:5173` in your browser.

## 🔐 Roles & Workflows

1.  **MSME**: Uploads invoices and accepts the best funding bids.
2.  **Buyer**: Verifies and confirms uploaded invoices to trigger the risk analysis.
3.  **Funder**: Evaluates verified invoices based on risk appetite and submits competitive discount bids to finance the MSME.
