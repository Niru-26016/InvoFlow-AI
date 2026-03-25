import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { CreditCard, CheckCircle, Clock, DollarSign, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function MakePayment() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['funded', 'settled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const handlePayment = async (invoice) => {
    setPaying(invoice.id);
    try {
      // Trigger settlement agent via backend
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        await axios.post(`${backendUrl}/api/agents/settle`, {
          invoiceId: invoice.id,
          amount: invoice.amount
        });
      } catch (e) {
        console.log('Direct settlement — backend may not be running');
      }
      
      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'settled',
        settledAt: new Date().toISOString(),
        paidBy: user.uid
      });
    } catch (err) {
      console.error('Payment failed:', err);
    }
    setPaying(null);
  };

  const pendingPayment = invoices.filter(i => i.status === 'funded');
  const completed = invoices.filter(i => i.status === 'settled');
  const totalDue = pendingPayment.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalPaid = completed.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Make Payment</h1>
        <p className="text-surface-400 mt-1">Pay funded invoices to release escrow to MSMEs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Clock} label="Total Due" value={`₹${(totalDue / 100000).toFixed(1)}L`} color="warning" />
        <StatCard icon={CheckCircle} label="Total Paid" value={`₹${(totalPaid / 100000).toFixed(1)}L`} color="accent" />
        <StatCard icon={CreditCard} label="Pending Payments" value={pendingPayment.length} color="primary" />
      </div>

      {/* Due Invoices */}
      {pendingPayment.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
            Payment Due ({pendingPayment.length})
          </h3>
          <div className="space-y-4">
            {pendingPayment.map((inv) => (
              <div key={inv.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-warning-500/15 flex items-center justify-center">
                      <DollarSign size={22} className="text-warning-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                      <p className="text-sm text-surface-400">MSME: {inv.msmeEmail?.split('@')[0]} • Due: {inv.dueDate || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xl font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-surface-500">Including {inv.acceptedFunder?.rate || 8.5}% funding fee</p>
                    </div>
                    <button
                      onClick={() => handlePayment(inv)}
                      disabled={paying === inv.id}
                      className="px-6 py-3 gradient-primary rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {paying === inv.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CreditCard size={16} /> Pay Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
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
                      Paid on {inv.settledAt ? new Date(inv.settledAt).toLocaleDateString('en-IN') : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                  <StatusBadge status="settled" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
