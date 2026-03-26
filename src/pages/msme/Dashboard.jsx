import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { FileText, DollarSign, CheckCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MSMEDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'invoices'),
      where('msmeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching invoices:', error);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const stats = {
    total: invoices.length,
    verified: invoices.filter(i => i.status === 'verified' || i.status === 'funded' || i.status === 'bidding').length,
    funded: invoices.filter(i => i.status === 'funded' || i.status === 'settled').length,
    totalAmount: invoices.filter(i => i.status === 'funded' || i.status === 'settled').reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0),
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--th-text)' }}>{t('msme.dashboard_title')}</h1>
          <p className="mt-1" style={{ color: 'var(--th-text-muted)' }}>{t('msme.dashboard_subtitle')}</p>
        </div>
        <Link
          to="/msme/upload"
          className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          {t('msme.upload_invoice_btn')} <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label={t('msme.total_invoices')} value={stats.total} color="primary" />
        <StatCard icon={CheckCircle} label={t('msme.verified')} value={stats.verified} color="accent" />
        <StatCard icon={DollarSign} label={t('msme.funded')} value={stats.funded} color="warning" />
        <StatCard icon={TrendingUp} label={t('msme.total_value')} value={`₹${stats.totalAmount >= 100000 ? (stats.totalAmount / 100000).toFixed(1) + 'L' : stats.totalAmount.toLocaleString('en-IN')}`} color="primary" />
      </div>

      {/* Recent Invoices */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--th-text)' }}>{t('msme.recent_invoices')}</h2>
          <Link to="/msme/verification" className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1">
            {t('common.view_all')} <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="text-surface-600 mx-auto mb-4" />
            <p style={{ color: 'var(--th-text-muted)' }}>{t('msme.no_invoices')}</p>
            <Link to="/msme/upload" className="text-primary-400 text-sm font-medium mt-2 inline-block">
              {t('msme.upload_first')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--th-border)' }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>{t('common.invoice_number')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>{t('common.buyer')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>{t('common.amount')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>{t('common.status')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="transition-colors" style={{ borderBottom: '1px solid var(--th-border-subtle)' }}>
                    <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-sm" style={{ color: 'var(--th-text-muted)' }}>{inv.buyerName || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--th-text)' }}>₹{(inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status || 'pending'} /></td>
                    <td className="py-3 px-4 text-sm" style={{ color: 'var(--th-text-muted)' }}>
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
