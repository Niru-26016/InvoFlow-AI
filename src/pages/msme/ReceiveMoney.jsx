import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { Wallet, CheckCircle, Clock, DollarSign, ArrowDownCircle, ShieldCheck, Banknote, Loader2 } from 'lucide-react';
import { logToLedger } from '../../services/blockchainService';
import { doc, updateDoc } from 'firebase/firestore';

export default function ReceiveMoney() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const handleWithdraw = async (invoice) => {
    setWithdrawingId(invoice.id);
    try {
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'funded',
        'stageStatuses.funding': 'completed'
      });

      // Log to blockchain
      await logToLedger(invoice.id, 'escrow_withdrawal_msme', {
        fromUser: 'Platform Escrow',
        fromName: 'Escrow',
        toUser: user.uid,
        toName: user.email?.split('@')[0] || 'MSME',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.acceptedFunder?.msmeReceives || invoice.amount
      });
    } catch (err) {
      console.error('Withdraw failed:', err);
    }
    setWithdrawingId(null);
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'invoices'),
      where('msmeId', '==', user.uid),
      where('status', 'in', ['accepted', 'funded', 'settled', 'escrow_funded'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // funded & settled = money received; escrow_funded = in escrow; accepted = awaiting funder disbursement
  const received = invoices.filter(i => i.status === 'funded' || i.status === 'settled');
  const inEscrow = invoices.filter(i => i.status === 'escrow_funded');
  const pending = invoices.filter(i => i.status === 'accepted');
  
  const totalReceived = received.reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0);
  const totalEscrow = inEscrow.reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0);
  const totalPending = pending.reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Receive Money</h1>
        <p className="text-surface-400 mt-1">Track disbursements and settlement status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Wallet} label="Total Received" value={`₹${totalReceived >= 100000 ? (totalReceived / 100000).toFixed(1) + 'L' : totalReceived.toLocaleString('en-IN')}`} color="accent" />
        <StatCard icon={ShieldCheck} label="In Escrow" value={`₹${totalEscrow >= 100000 ? (totalEscrow / 100000).toFixed(1) + 'L' : totalEscrow.toLocaleString('en-IN')}`} color="primary" />
        <StatCard icon={Clock} label="Pending Disbursement" value={`₹${totalPending >= 100000 ? (totalPending / 100000).toFixed(1) + 'L' : totalPending.toLocaleString('en-IN')}`} color="warning" />
      </div>

      {/* Escrow Wallet */}
      {inEscrow.length > 0 && (
        <div className="mb-8 p-6 rounded-xl border" style={{ background: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--th-text)' }}>Escrow Wallet</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 font-medium">
              Ready to Withdraw ({inEscrow.length})
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: 'var(--th-text-muted)' }}>
            These funds have been deposited by funders and are securely held in escrow. Withdraw them to your linked bank account.
          </p>

          <div className="space-y-3">
            {inEscrow.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border gap-4" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <ShieldCheck size={22} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber}</p>
                    <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>From Funder: {inv.acceptedFunder?.name || 'Funder'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>₹{(inv.acceptedFunder?.msmeReceives || inv.amount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs" style={{ color: 'var(--th-text-faint)' }}>Available to withdraw</p>
                  </div>
                  <button
                    onClick={() => handleWithdraw(inv)}
                    disabled={withdrawingId === inv.id}
                    className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {withdrawingId === inv.id ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : (
                      <><Banknote size={16} /> Withdraw to Bank</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Settlement History</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : [...received, ...pending].length === 0 ? (
          <div className="text-center py-12">
            <ArrowDownCircle size={48} className="text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">No settlements yet</p>
            <p className="text-surface-500 text-sm mt-1">Funds will appear here once invoices are withdrawn from escrow</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...received, ...pending].map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-800/30 rounded-xl border border-surface-800 gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    inv.status === 'accepted' ? 'bg-warning-500/15' : 'bg-accent-500/15'
                  }`}>
                    {inv.status === 'accepted' ? (
                      <Clock size={18} className="text-warning-400" />
                    ) : (
                      <CheckCircle size={18} className="text-accent-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{inv.invoiceNumber}</p>
                    <p className="text-xs text-surface-400">{inv.buyerName} • {inv.acceptedFunder?.name || 'Funder'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">₹{(inv.acceptedFunder?.msmeReceives || inv.amount || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-surface-500">
                      Invoice: ₹{(inv.amount || 0).toLocaleString('en-IN')} • Discount: {inv.acceptedFunder?.rate || 0}%
                    </p>
                    <p className="text-xs text-surface-500">
                      {inv.fundedAt ? new Date(inv.fundedAt).toLocaleDateString('en-IN') : 'Pending'}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
