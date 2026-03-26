import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { logToLedger } from '../../services/blockchainService';

// ─── Custom Risk Scoring Algorithm ────────────────────────────────────
// Uses: Buyer creditScore, paymentHistory, avgPaymentDays, invoice amount,
//       due date proximity, GSTIN validation, AI confidence
function calculateRiskScore(invoice, buyerData) {
  let score = 0;
  const reasons = [];

  // ── Factor 1: Buyer Credit Score (40% weight) ──────────────────────
  if (buyerData) {
    const creditContribution = (buyerData.creditScore / 100) * 40;
    score += creditContribution;
    if (buyerData.creditScore >= 80) reasons.push(`Buyer credit score: ${buyerData.creditScore}/100 (Excellent)`);
    else if (buyerData.creditScore >= 65) reasons.push(`Buyer credit score: ${buyerData.creditScore}/100 (Good)`);
    else reasons.push(`Buyer credit score: ${buyerData.creditScore}/100 (Below Average)`);
  } else {
    score += 20; // Unknown buyer gets a neutral 50% of the 40 weight
    reasons.push('Buyer not found in database — neutral score applied');
  }

  // ── Factor 2: Payment History (20% weight) ─────────────────────────
  if (buyerData) {
    const historyMap = { 'EXCELLENT': 20, 'GOOD': 15, 'AVERAGE': 10, 'POOR': 3 };
    const historyScore = historyMap[buyerData.paymentHistory] || 10;
    score += historyScore;
    reasons.push(`Payment history: ${buyerData.paymentHistory} (+${historyScore})`);
  } else {
    score += 10;
    reasons.push('Payment history unknown (+10)');
  }

  // ── Factor 3: Average Payment Days (15% weight) ────────────────────
  if (buyerData) {
    if (buyerData.avgPaymentDays <= 25) { score += 15; reasons.push(`Avg payment: ${buyerData.avgPaymentDays} days (Fast)`); }
    else if (buyerData.avgPaymentDays <= 35) { score += 10; reasons.push(`Avg payment: ${buyerData.avgPaymentDays} days (Normal)`); }
    else if (buyerData.avgPaymentDays <= 50) { score += 5; reasons.push(`Avg payment: ${buyerData.avgPaymentDays} days (Slow)`); }
    else { score += 2; reasons.push(`Avg payment: ${buyerData.avgPaymentDays} days (Very Slow)`); }
  } else {
    score += 7;
  }

  // ── Factor 4: Invoice Amount Risk (10% weight) ─────────────────────
  const amount = parseFloat(invoice.amount) || 0;
  if (amount <= 50000) { score += 10; reasons.push('Low invoice amount (≤₹50K) — low risk'); }
  else if (amount <= 100000) { score += 7; reasons.push('Moderate invoice amount (≤₹1L)'); }
  else if (amount <= 500000) { score += 4; reasons.push('High invoice amount (≤₹5L)'); }
  else { score += 1; reasons.push('Very high invoice amount (>₹5L) — high risk'); }

  // ── Factor 5: Due Date Proximity (10% weight) ──────────────────────
  if (invoice.dueDate) {
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilDue < 0) { score += 0; reasons.push('Invoice is PAST DUE — critical risk'); }
    else if (daysUntilDue < 15) { score += 3; reasons.push(`Due in ${daysUntilDue} days (tight)`); }
    else if (daysUntilDue < 30) { score += 6; reasons.push(`Due in ${daysUntilDue} days (moderate)`); }
    else { score += 10; reasons.push(`Due in ${daysUntilDue} days (comfortable)`); }
  } else {
    score += 3; reasons.push('No due date specified');
  }

  // ── Factor 6: GSTIN Validation (5% weight) ─────────────────────────
  const gstin = invoice.buyerGSTIN || '';
  if (gstin.length === 15 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
    score += 5; reasons.push('Valid GSTIN format confirmed');
  } else if (gstin.length > 0) {
    score += 2; reasons.push('GSTIN format looks suspicious');
  } else {
    score += 0; reasons.push('No GSTIN provided');
  }

  // Clamp between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine grade
  let grade;
  if (score >= 85) grade = 'A+';
  else if (score >= 75) grade = 'A';
  else if (score >= 65) grade = 'B+';
  else if (score >= 55) grade = 'B';
  else if (score >= 45) grade = 'C';
  else grade = 'D';

  // Determine which funders can take this risk
  const riskLevel = score >= 75 ? 'LOW' : score >= 55 ? 'MEDIUM' : 'HIGH';

  return { riskScore: score, grade, reasons, riskLevel,
    paymentHistory: buyerData?.paymentHistory || 'UNKNOWN',
    buyerCreditScore: buyerData?.creditScore || null,
    avgPaymentDays: buyerData?.avgPaymentDays || null
  };
}



// ─── Component ────────────────────────────────────────────────────────
export default function ConfirmInvoice() {
  const { user, userProfile } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['pending', 'verifying', 'verified', 'bidding'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const handleConfirm = async (invoice) => {
    setProcessingId(invoice.id);
    const ref = doc(db, 'invoices', invoice.id);

    try {
      // Step 0: Fetch buyer profile from 'buyers' collection
      let buyerData = null;
      
      // Try matching by GSTIN
      if (userProfile?.gstin) {
        const byGst = await getDocs(query(collection(db, 'buyers'), where('gst', '==', userProfile.gstin)));
        if (!byGst.empty) buyerData = byGst.docs[0].data();
      }
      // Fallback: match by name
      if (!buyerData && userProfile?.companyName) {
        const byName = await getDocs(query(collection(db, 'buyers'), where('name', '==', userProfile.companyName)));
        if (!byName.empty) buyerData = byName.docs[0].data();
      }

      // Verify Buyer details match the PDF
      const buyerNameOnPdf = (invoice.buyerName || '').trim().toLowerCase();
      const buyerGstinOnPdf = (invoice.buyerGSTIN || '').trim().toUpperCase();
      const myName = (buyerData?.name || userProfile?.companyName || '').trim().toLowerCase();
      const myGstin = (buyerData?.gst || userProfile?.gstin || '').trim().toUpperCase();

      const nameMatch = myName && buyerNameOnPdf && (buyerNameOnPdf.includes(myName) || myName.includes(buyerNameOnPdf));
      const gstinMatch = myGstin && buyerGstinOnPdf && myGstin === buyerGstinOnPdf;

      const buyerVerification = {
        nameMatch,
        gstinMatch,
        verified: nameMatch && gstinMatch,
        message: (nameMatch && gstinMatch)
          ? 'Buyer details verified. Name and GSTIN match.'
          : [
              !nameMatch && 'Buyer name mismatch detected.',
              !gstinMatch && 'Buyer GSTIN mismatch detected.',
            ].filter(Boolean).join(' ')
      };

      // If buyer verification fails, reject the invoice
      if (!buyerVerification.verified) {
        await updateDoc(ref, {
          buyerConfirmed: false,
          buyerVerification,
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: user.uid,
          rejectionReason: `Buyer identity mismatch: ${buyerVerification.message}`,
          'stageStatuses.upload': 'completed',
          'stageStatuses.verification': 'failed'
        });
        setProcessingId(null);

        // Log rejection to blockchain
        await logToLedger(invoice.id, 'invoice_rejected', {
          fromUser: user.uid,
          fromName: userProfile?.companyName || user.email,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          metadata: { reason: buyerVerification.message }
        });

        return;
      }

      // Step 1: Mark as verified (agentStage 1)
      await updateDoc(ref, {
        buyerConfirmed: true,
        buyerConfirmedAt: new Date().toISOString(),
        buyerConfirmedBy: user.uid,
        buyerCompanyName: buyerData?.name || userProfile?.companyName || '',
        buyerVerification,
        status: 'verified',
        verified: true,
        agentStage: 2,
        'stageStatuses.upload': 'completed',
        'stageStatuses.verification': 'completed',
        'stageStatuses.risk': 'active'
      });

      // Step 2: Run risk scoring algorithm (using real buyer data from Firestore)
      const riskResult = calculateRiskScore(invoice, buyerData);
      
      // Small delay to show the spinning animation
      await new Promise(r => setTimeout(r, 1500));

      await updateDoc(ref, {
        agentStage: 3,
        riskResult,
        'stageStatuses.risk': 'completed',
        'stageStatuses.bidding': 'active'
      });

      // Log verification to blockchain
      await logToLedger(invoice.id, 'invoice_verified', {
        fromUser: user.uid,
        fromName: userProfile?.companyName || user.email,
        toUser: invoice.msmeId,
        toName: invoice.msmeCompanyName || 'MSME',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        metadata: { riskScore: riskResult.riskScore, riskGrade: riskResult.grade }
      });

    } catch (err) {
      console.error('Pipeline error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDispute = async (invoiceId) => {
    await updateDoc(doc(db, 'invoices', invoiceId), {
      buyerConfirmed: false,
      buyerDisputed: true,
      buyerDisputedAt: new Date().toISOString(),
      status: 'rejected',
      'stageStatuses.upload': 'completed',
      'stageStatuses.verification': 'failed'
    });
  };

  const pendingInvoices = invoices.filter(i => !i.buyerConfirmed && !i.buyerDisputed);
  const processedInvoices = invoices.filter(i => i.buyerConfirmed || i.buyerDisputed);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Confirm Invoices</h1>
        <p className="text-surface-400 mt-1">Review and confirm invoices from your MSME suppliers. Confirming triggers risk assessment and funder matching.</p>
      </div>

      {/* Pending */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
          Pending Confirmation ({pendingInvoices.length})
        </h3>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : pendingInvoices.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <CheckCircle size={48} className="text-accent-400 mx-auto mb-4" />
            <p className="text-surface-300 text-lg">All caught up!</p>
            <p className="text-surface-500 text-sm">No invoices pending confirmation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingInvoices.map((inv) => (
              <div key={inv.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</h3>
                    <p className="text-surface-400 text-sm">From: {inv.msmeCompanyName || inv.msmeEmail?.split('@')[0] || 'MSME'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.authenticity && <StatusBadge status={inv.authenticity} />}
                    <StatusBadge status="awaiting" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-surface-800/50 p-3 rounded-xl">
                    <p className="text-xs text-surface-500">Amount</p>
                    <p className="text-sm font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-surface-800/50 p-3 rounded-xl">
                    <p className="text-xs text-surface-500">GSTIN</p>
                    <p className="text-sm font-medium text-white truncate">{inv.buyerGSTIN || 'N/A'}</p>
                  </div>
                  <div className="bg-surface-800/50 p-3 rounded-xl">
                    <p className="text-xs text-surface-500">Due Date</p>
                    <p className="text-sm font-medium text-white">{inv.dueDate || 'N/A'}</p>
                  </div>
                  <div className="bg-surface-800/50 p-3 rounded-xl">
                    <p className="text-xs text-surface-500">Submitted</p>
                    <p className="text-sm font-medium text-white">
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>
                {inv.description && (
                  <p className="text-sm text-surface-400 mb-4 p-3 bg-surface-800/30 rounded-xl">{inv.description}</p>
                )}

                {/* Buyer Identity Check Preview */}
                <div className="mb-4 p-4 rounded-xl border" style={{ background: 'var(--th-bg-input)', borderColor: 'var(--th-border-input)' }}>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">🔍 Buyer Identity Check</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-surface-900/50">
                      <div>
                        <p className="text-xs text-surface-500">Buyer Name (PDF)</p>
                        <p className="text-sm text-white font-medium">{inv.buyerName || 'N/A'}</p>
                      </div>
                      {userProfile?.companyName && inv.buyerName && (
                        (inv.buyerName.toLowerCase().includes(userProfile.companyName.toLowerCase()) || userProfile.companyName.toLowerCase().includes(inv.buyerName.toLowerCase()))
                          ? <span className="text-xs px-2 py-1 rounded-full bg-accent-500/15 text-accent-400">✅ Match</span>
                          : <span className="text-xs px-2 py-1 rounded-full bg-warning-500/15 text-warning-400">⚠️ Mismatch</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-surface-900/50">
                      <div>
                        <p className="text-xs text-surface-500">Buyer GSTIN (PDF)</p>
                        <p className="text-sm text-white font-medium font-mono">{inv.buyerGSTIN || 'N/A'}</p>
                      </div>
                      {userProfile?.gstin && inv.buyerGSTIN && (
                        userProfile.gstin.toUpperCase() === inv.buyerGSTIN.toUpperCase()
                          ? <span className="text-xs px-2 py-1 rounded-full bg-accent-500/15 text-accent-400">✅ Match</span>
                          : <span className="text-xs px-2 py-1 rounded-full bg-warning-500/15 text-warning-400">⚠️ Mismatch</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-surface-500 mt-2">
                    Your profile: {userProfile?.companyName || 'Not set'} • {userProfile?.gstin || 'GSTIN not set'}
                  </p>
                </div>

                {processingId === inv.id ? (
                  <div className="flex items-center justify-center gap-3 py-3 text-primary-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-medium">Running AI Pipeline: Risk → Match → Fund...</span>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirm(inv)}
                      className="flex-1 py-2.5 rounded-xl gradient-accent text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    >
                      <CheckCircle size={16} /> Confirm & Process
                    </button>
                    <button
                      onClick={() => handleDispute(inv.id)}
                      className="flex-1 py-2.5 rounded-xl bg-danger-500/15 border border-danger-500/30 text-danger-400 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-danger-500/25 transition-all"
                    >
                      <XCircle size={16} /> Dispute
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed */}
      {processedInvoices.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">Processed</h3>
          <div className="glass-card p-6 space-y-3">
            {processedInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-800/30 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                  <p className="text-xs text-surface-400">₹{(inv.amount || 0).toLocaleString('en-IN')}
                    {inv.riskResult && <span className="ml-2">• Risk: {inv.riskResult.grade} ({inv.riskResult.riskScore}/100)</span>}
                  </p>
                </div>
                <StatusBadge status={inv.buyerConfirmed ? 'confirmed' : 'rejected'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
