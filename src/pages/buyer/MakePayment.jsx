import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { CreditCard, CheckCircle, Clock, DollarSign, Banknote, Building, User } from 'lucide-react';
import { logToLedger } from '../../services/blockchainService';

export default function MakePayment() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    // Include verified & accepted (pay MSME) + funded (pay Funder) + settled (completed)
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['verified', 'accepted', 'funded', 'settled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // Pay MSME directly (invoice not funded by any funder)
  const handlePayMSME = async (invoice) => {
    setPaying(invoice.id);
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'settled',
        settledAt: new Date().toISOString(),
        buyerPaidAt: new Date().toISOString(),
        paidBy: user.uid,
        buyerPaidTo: 'msme',
        buyerPaidToName: invoice.msmeCompanyName || 'MSME',
        buyerPaidAmount: invoice.amount,
        agentStage: 7,
        'stageStatuses.settlement': 'completed'
      });

      // Log to blockchain
      await logToLedger(invoice.id, 'settlement_msme', {
        fromUser: user.uid,
        fromName: 'Buyer',
        toUser: invoice.msmeId,
        toName: invoice.msmeCompanyName || 'MSME',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount
      });
    } catch (err) {
      console.error('Payment failed:', err);
    }
    setPaying(null);
  };

  // Pay Funder (invoice was funded — funder already paid MSME)
  const handlePayFunder = async (invoice) => {
    setPaying(invoice.id);
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'settled',
        settledAt: new Date().toISOString(),
        buyerPaidAt: new Date().toISOString(),
        paidBy: user.uid,
        buyerPaidTo: 'funder',
        buyerPaidToName: invoice.acceptedFunder?.name || 'Funder',
        buyerPaidAmount: invoice.amount,
        agentStage: 7,
        'stageStatuses.settlement': 'completed'
      });

      // Log to blockchain
      await logToLedger(invoice.id, 'settlement_funder', {
        fromUser: user.uid,
        fromName: 'Buyer',
        toUser: invoice.acceptedFunder?.funderId,
        toName: invoice.acceptedFunder?.name || 'Funder',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount
      });
    } catch (err) {
      console.error('Payment failed:', err);
    }
    setPaying(null);
  };

  // Categorize invoices
  const payToMSME = invoices.filter(i => ['verified', 'accepted'].includes(i.status) && !i.acceptedFunder);
  const payToFunder = invoices.filter(i => i.status === 'funded');
  const completed = invoices.filter(i => i.status === 'settled');

  const totalDueToMSME = payToMSME.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalDueToFunder = payToFunder.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = completed.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Make Payment</h1>
        <p className="text-surface-400 mt-1">Pay invoice amounts to MSME suppliers or the funding partner</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={User} label="Due to MSME" value={`₹${totalDueToMSME >= 100000 ? (totalDueToMSME / 100000).toFixed(1) + 'L' : totalDueToMSME.toLocaleString('en-IN')}`} color="warning" />
        <StatCard icon={Building} label="Due to Funders" value={`₹${totalDueToFunder >= 100000 ? (totalDueToFunder / 100000).toFixed(1) + 'L' : totalDueToFunder.toLocaleString('en-IN')}`} color="primary" />
        <StatCard icon={CheckCircle} label="Total Paid" value={`₹${totalPaid >= 100000 ? (totalPaid / 100000).toFixed(1) + 'L' : totalPaid.toLocaleString('en-IN')}`} color="accent" />
        <StatCard icon={CreditCard} label="Pending" value={payToMSME.length + payToFunder.length} color="warning" />
      </div>

      {/* How it works */}
      <div className="glass-card p-4 mb-6">
        <p className="text-sm text-surface-300">
          <strong className="text-primary-400">How it works:</strong> If no funder has financed the invoice, you pay the <strong>MSME directly</strong> (full amount).
          If a funder has already advanced money to the MSME, you pay the <strong>full invoice amount to the Funder</strong> on the due date.
        </p>
      </div>

      {/* ─── Section 1: Pay MSME (Not Funded) ─── */}
      {payToMSME.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User size={14} /> Payment Due to MSME ({payToMSME.length})
          </h3>
          <div className="space-y-4">
            {payToMSME.map((inv) => (
              <div key={inv.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-500/15 flex items-center justify-center">
                      <User size={22} className="text-accent-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                      <p className="text-sm text-surface-400">
                        MSME: {inv.msmeCompanyName || inv.msmeEmail?.split('@')[0] || 'N/A'} • Due: {inv.dueDate || 'N/A'}
                      </p>
                      <p className="text-xs text-accent-400 mt-1 flex items-center gap-1">
                        <User size={12} /> Pay to: {inv.msmeCompanyName || 'MSME'} (Direct — No funder involved)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-surface-500">Full invoice amount → MSME</p>
                    </div>
                    <button
                      onClick={() => handlePayMSME(inv)}
                      disabled={paying === inv.id}
                      className="px-6 py-3 gradient-accent rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {paying === inv.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><CreditCard size={16} /> Pay MSME</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Section 2: Pay Funder (Invoice was funded) ─── */}
      {payToFunder.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building size={14} /> Payment Due to Funders ({payToFunder.length})
          </h3>
          <div className="space-y-4">
            {payToFunder.map((inv) => (
              <div key={inv.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-warning-500/15 flex items-center justify-center">
                      <Banknote size={22} className="text-warning-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                      <p className="text-sm text-surface-400">
                        MSME: {inv.msmeCompanyName || 'N/A'} • Due: {inv.dueDate || 'N/A'}
                      </p>
                      <p className="text-xs text-primary-400 mt-1 flex items-center gap-1">
                        <Building size={12} /> Pay to: {inv.acceptedFunder?.name || 'Funder'} (Funder already paid MSME ₹{(inv.acceptedFunder?.msmeReceives || 0).toLocaleString('en-IN')})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-surface-500">Full invoice amount → Funder</p>
                    </div>
                    <button
                      onClick={() => handlePayFunder(inv)}
                      disabled={paying === inv.id}
                      className="px-6 py-3 gradient-primary rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {paying === inv.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><CreditCard size={16} /> Pay Funder</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Section 3: Completed Payments ─── */}
      <div>
        <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
          Completed Payments ({completed.length})
        </h3>
        {completed.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <CreditCard size={48} className="text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">No completed payments yet</p>
          </div>
        ) : (
          <div className="glass-card p-6 space-y-3">
            {completed.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-surface-800/30 rounded-xl border border-surface-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center">
                    <CheckCircle size={18} className="text-accent-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                    <p className="text-xs text-surface-400">
                      Paid ₹{(inv.amount || 0).toLocaleString('en-IN')} to {inv.buyerPaidTo === 'funder'
                        ? `${inv.buyerPaidToName || inv.acceptedFunder?.name || 'Funder'} (Funder)`
                        : `${inv.buyerPaidToName || inv.msmeCompanyName || 'MSME'} (MSME)`
                      } on {inv.settledAt ? new Date(inv.settledAt).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>
                <StatusBadge status="settled" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
