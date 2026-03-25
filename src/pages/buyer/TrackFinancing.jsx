import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import StatusBadge from '../../components/StatusBadge';
import { TrendingUp, ArrowRight, CheckCircle, Clock, DollarSign, Zap } from 'lucide-react';

const stageLabels = ['Uploading', 'Verification', 'Risk Assessment', 'Funder Matching', 'Funded', 'Settlement'];

export default function TrackFinancing() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'invoices'),
      where('buyerConfirmed', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const getStageFromStatus = (status) => {
    const map = { pending: 0, verifying: 1, verified: 2, matched: 3, funded: 4, settled: 5 };
    return map[status] || 0;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Track Financing</h1>
        <p className="text-surface-400 mt-1">Monitor the financing progress of confirmed invoices</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <TrendingUp size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No financing to track</p>
          <p className="text-surface-500 text-sm mt-1">Confirmed invoices will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {invoices.map((inv) => {
            const stage = getStageFromStatus(inv.status);
            return (
              <div key={inv.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</h3>
                    <p className="text-surface-400 text-sm">MSME: {inv.msmeEmail?.split('@')[0]} • ₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>

                {/* Progress bar */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    {stageLabels.map((label, index) => (
                      <div key={index} className="flex flex-col items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${
                          index <= stage 
                            ? 'bg-accent-500/20 text-accent-400' 
                            : 'bg-surface-800 text-surface-600'
                        }`}>
                          {index < stage ? (
                            <CheckCircle size={16} />
                          ) : index === stage ? (
                            <Zap size={14} className="animate-pulse" />
                          ) : (
                            <Clock size={14} />
                          )}
                        </div>
                        <span className={`text-xs text-center hidden sm:block ${
                          index <= stage ? 'text-accent-400 font-medium' : 'text-surface-600'
                        }`}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Progress line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-surface-800 -z-10">
                    <div 
                      className="h-full bg-accent-500 transition-all duration-500" 
                      style={{ width: `${(stage / (stageLabels.length - 1)) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
