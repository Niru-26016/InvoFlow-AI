import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../../components/StatusBadge';
import { FileText, DollarSign, Calendar, Shield, Percent, CheckCircle, Banknote, Loader2 } from 'lucide-react';
import { logToLedger } from '../../services/blockchainService';

// Risk appetite determines which invoices a funder can see
// HIGH risk taker → sees ALL invoices (including risky ones)
// MEDIUM → sees LOW + MEDIUM risk invoices
// LOW (safe player) → sees only LOW risk invoices
const RISK_LEVELS = {
  HIGH:   { label: 'High Risk Taker',  desc: 'See all invoices including risky ones', minScore: 0 },
  MEDIUM: { label: 'Moderate',          desc: 'See medium and low risk invoices',      minScore: 55 },
  LOW:    { label: 'Safe Player',       desc: 'See only low risk invoices',            minScore: 75 },
};

export default function AvailableInvoices() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskAppetite, setRiskAppetite] = useState('MEDIUM');
  const [bidRates, setBidRates] = useState({});    // { invoiceId: '8.5' }
  const [offeringId, setOfferingId] = useState(null);
  const [disbursingId, setDisbursingId] = useState(null);
  const [acceptedInvoices, setAcceptedInvoices] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['verified', 'bidding'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // Listen for invoices where this funder's bid was accepted
  useEffect(() => {
    if (!user) return;
    const q2 = query(
      collection(db, 'invoices'),
      where('status', 'in', ['accepted', 'funded', 'escrow_funded'])
    );
    const unsub = onSnapshot(q2, (snap) => {
      const myAccepted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(inv => inv.acceptedFunder?.funderId === user.uid);
      setAcceptedInvoices(myAccepted);
    });
    return unsub;
  }, [user]);

  const handleDisburse = async (invoice) => {
    setDisbursingId(invoice.id);
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'escrow_funded',
        fundedAt: new Date().toISOString(),
        agentStage: 6,
        'stageStatuses.funding': 'active', // funding not fully complete until MSME withdraws
        'stageStatuses.settlement': 'pending'
      });

      // Log to blockchain
      await logToLedger(invoice.id, 'escrow_deposit', {
        fromUser: user.uid,
        fromName: user.displayName || user.email?.split('@')[0] || 'Funder',
        toUser: invoice.msmeId,
        toName: invoice.msmeCompanyName || 'MSME',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.acceptedFunder?.msmeReceives || invoice.amount,
        metadata: { rate: invoice.acceptedFunder?.rate }
      });
    } catch (err) {
      alert('Disbursement failed: ' + err.message);
    } finally {
      setDisbursingId(null);
    }
  };

  const handleBid = async (invoice) => {
    const rate = parseFloat(bidRates[invoice.id]);
    if (!rate || rate <= 0 || rate > 50) {
      alert('Please enter a valid discount rate between 0.1% and 50%');
      return;
    }

    setOfferingId(invoice.id);
    try {
      const discountAmount = Math.round(invoice.amount * (rate / 100));
      const msmeReceives = invoice.amount - discountAmount;

      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'bidding',
        agentStage: 3,
        'stageStatuses.bidding': 'completed',
        matchedFunders: arrayUnion({
          funderId: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Funder',
          rate: rate,
          amount: invoice.amount,
          discountAmount,
          msmeReceives,
          type: 'NBFC',
          offeredAt: new Date().toISOString()
        })
      });
      setBidRates(prev => ({ ...prev, [invoice.id]: '' }));

      // Log to blockchain
      await logToLedger(invoice.id, 'bid_placed', {
        fromUser: user.uid,
        fromName: user.displayName || user.email?.split('@')[0] || 'Funder',
        invoiceNumber: invoice.invoiceNumber,
        amount: msmeReceives,
        metadata: { rate, discountAmount, originalAmount: invoice.amount }
      });
    } catch (err) {
      console.error('Bid error:', err);
      alert('Failed to submit bid: ' + err.message);
    } finally {
      setOfferingId(null);
    }
  };

  // Filter invoices by funder's risk appetite
  const minScore = RISK_LEVELS[riskAppetite].minScore;
  const filteredInvoices = invoices.filter(inv => {
    const score = inv.riskResult?.riskScore || 0;
    return score >= minScore;
  });

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--th-text)' }}>Available Invoices</h1>
          <p className="mt-1" style={{ color: 'var(--th-text-muted)' }}>Place bids on invoices matching your risk profile</p>
        </div>
      </div>

      {/* Risk Appetite Selector */}
      <div className="glass-card p-4 mb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--th-text)' }}>Your Risk Appetite</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RISK_LEVELS).map(([key, { label, desc }]) => (
            <button
              key={key}
              onClick={() => setRiskAppetite(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                riskAppetite === key
                  ? key === 'HIGH' ? 'bg-danger-500/20 text-danger-400 border-danger-500/30'
                    : key === 'MEDIUM' ? 'bg-warning-500/20 text-warning-400 border-warning-500/30'
                    : 'bg-accent-500/20 text-accent-400 border-accent-500/30'
                  : 'bg-surface-800/50 text-surface-400 border-surface-700 hover:text-white'
              }`}
            >
              {key === 'HIGH' ? '🔥' : key === 'MEDIUM' ? '⚖️' : '🛡️'} {label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--th-text-muted)' }}>{RISK_LEVELS[riskAppetite].desc} (min score: {minScore})</p>
      </div>

      {/* ─── Pending Disbursements ─── */}
      {acceptedInvoices.filter(i => i.status === 'accepted').length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--th-text)' }}>
            <Banknote size={20} className="text-warning-400" />
            Pending Disbursements ({acceptedInvoices.filter(i => i.status === 'accepted').length})
          </h2>
          <div className="space-y-3">
            {acceptedInvoices.filter(i => i.status === 'accepted').map((inv) => (
              <div key={inv.id} className="glass-card p-5 border-warning-500/20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--th-text-muted)' }}>
                      MSME: {inv.msmeCompanyName || 'N/A'} • Buyer: {inv.buyerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Amount to Pay</p>
                      <p className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>
                        ₹{(inv.acceptedFunder?.msmeReceives || inv.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
                        Invoice: ₹{(inv.amount || 0).toLocaleString('en-IN')} • Discount: {inv.acceptedFunder?.rate}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleDisburse(inv)}
                      disabled={disbursingId === inv.id}
                      className="px-5 py-3 gradient-accent rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {disbursingId === inv.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <><Banknote size={16} /> Disburse to Escrow</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funded History */}
      {acceptedInvoices.filter(i => ['funded', 'escrow_funded'].includes(i.status)).length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--th-text-muted)' }}>
            Recent Disbursements ({acceptedInvoices.filter(i => ['funded', 'escrow_funded'].includes(i.status)).length})
          </h2>
          <div className="space-y-3">
            {acceptedInvoices.filter(i => ['funded', 'escrow_funded'].includes(i.status)).map((inv) => (
              <div key={inv.id} className="glass-card p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</p>
                    <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Paid ₹{(inv.acceptedFunder?.msmeReceives || 0).toLocaleString('en-IN')} to {inv.msmeCompanyName || 'MSME'}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-lg" style={{ color: 'var(--th-text-muted)' }}>No invoices match your risk profile</p>
          <p className="text-sm mt-2" style={{ color: 'var(--th-text-faint)' }}>Try changing your risk appetite to see more invoices</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInvoices.map((inv) => {
            const alreadyBid = inv.matchedFunders?.some(f => f.funderId === user.uid);
            const myBid = inv.matchedFunders?.find(f => f.funderId === user.uid);
            const riskScore = inv.riskResult?.riskScore || 0;
            const riskColor = riskScore >= 75 ? 'text-accent-400' : riskScore >= 55 ? 'text-warning-400' : 'text-danger-400';

            return (
              <div key={inv.id} className="glass-card p-6 hover:glow-primary transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--th-text-muted)' }}>MSME: {inv.msmeEmail?.split('@')[0] || 'N/A'}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    inv.matchedFunders?.length > 0 ? 'bg-warning-500/15 text-warning-400' : 'bg-accent-500/15 text-accent-400'
                  }`}>
                    {inv.matchedFunders?.length > 0 ? `${inv.matchedFunders.length} bid(s)` : 'Open'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign size={14} className="text-primary-400" />
                      <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Invoice Value</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-warning-400" />
                      <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Due Date</span>
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>{inv.dueDate || 'N/A'}</p>
                  </div>
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={14} className="text-accent-400" />
                      <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Risk Score</span>
                    </div>
                    <p className={`text-sm font-bold ${riskColor}`}>
                      {riskScore}/100 ({inv.riskResult?.grade || 'N/A'})
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={14} className="text-surface-400 border-surface-700/50" />
                      <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Buyer</span>
                    </div>
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--th-text)' }}>{inv.buyerName || 'N/A'}</p>
                  </div>
                </div>

                {alreadyBid ? (
                  <div className="w-full py-2.5 rounded-xl bg-accent-500/15 border border-accent-500/30 text-accent-400 text-sm font-semibold flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Bid Placed at {myBid?.rate}% (MSME gets ₹{(myBid?.msmeReceives || 0).toLocaleString('en-IN')})
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Bid input */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="50"
                          placeholder="Enter discount %"
                          value={bidRates[inv.id] || ''}
                          onChange={(e) => setBidRates(prev => ({ ...prev, [inv.id]: e.target.value }))}
                          className="w-full px-4 py-2.5 outline-none transition-all pr-8"
                        />
                        <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--th-text-muted)' }} />
                      </div>
                      <button
                        onClick={() => handleBid(inv)}
                        disabled={offeringId === inv.id || !bidRates[inv.id]}
                        className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {offeringId === inv.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><DollarSign size={14} /> Bid</>
                        )}
                      </button>
                    </div>
                    {/* Preview what MSME receives */}
                    {bidRates[inv.id] && parseFloat(bidRates[inv.id]) > 0 && (
                      <p className="text-xs px-1" style={{ color: 'var(--th-text-muted)' }}>
                        MSME receives: <span className="font-medium" style={{ color: 'var(--th-text)' }}>
                          ₹{(inv.amount - Math.round(inv.amount * (parseFloat(bidRates[inv.id]) / 100))).toLocaleString('en-IN')}
                        </span>
                        {' '}(discount: ₹{Math.round(inv.amount * (parseFloat(bidRates[inv.id]) / 100)).toLocaleString('en-IN')})
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
