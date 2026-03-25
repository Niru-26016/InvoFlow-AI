import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { Wallet, CheckCircle, Clock, DollarSign, ArrowDownCircle } from 'lucide-react';

export default function ReceiveMoney() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'invoices'),
      where('msmeId', '==', user.uid),
      where('status', 'in', ['accepted', 'funded', 'settled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // funded & settled = money received; accepted = awaiting funder disbursement
  const received = invoices.filter(i => i.status === 'funded' || i.status === 'settled');
  const pending = invoices.filter(i => i.status === 'accepted');
  const totalReceived = received.reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0);
  const totalPending = pending.reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Receive Money</h1>
        <p className="text-surface-400 mt-1">Track disbursements and settlement status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Wallet} label="Total Received" value={`₹${(totalReceived / 100000).toFixed(1)}L`} color="accent" />
        <StatCard icon={Clock} label="Pending Disbursement" value={`₹${(totalPending / 100000).toFixed(1)}L`} color="warning" />
        <StatCard icon={DollarSign} label="Total Transactions" value={invoices.length} color="primary" />
      </div>

      {/* Transactions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Settlement History</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <ArrowDownCircle size={48} className="text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">No settlements yet</p>
            <p className="text-surface-500 text-sm mt-1">Funds will appear here once invoices are funded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
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
