import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { Building, FileText, Clock, CreditCard, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'invoices'),
      where('buyerGSTIN', '!=', '')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const pendingConfirmation = invoices.filter(i => i.status === 'pending' || i.status === 'verifying');
  const confirmed = invoices.filter(i => i.buyerConfirmed);
  const funded = invoices.filter(i => i.status === 'funded' || i.status === 'settled');

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('buyer.dashboard_title')}</h1>
          <p className="text-surface-400 mt-1">{t('buyer.dashboard_subtitle')}</p>
        </div>
        <Link
          to="/buyer/confirm"
          className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          {t('buyer.pending_confirmations')} <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t('buyer.total_invoices')} value={invoices.length} color="primary" />
        <StatCard icon={Clock} label={t('buyer.pending_confirm')} value={pendingConfirmation.length} color="warning" />
        <StatCard icon={Building} label={t('buyer.total_confirmed')} value={confirmed.length} color="accent" />
        <StatCard icon={CreditCard} label={t('buyer.financing_active')} value={funded.length} color="primary" />
      </div>

      {/* Recent activity */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">{t('buyer.recent_activity')}</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <Building size={48} className="text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">{t('buyer.no_invoices')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-surface-800/30 rounded-xl border border-surface-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                    <FileText size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                    <p className="text-xs text-surface-400">{t('common.from')}: {inv.msmeEmail?.split('@')[0] || 'MSME'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                  <StatusBadge status={inv.status || 'pending'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
