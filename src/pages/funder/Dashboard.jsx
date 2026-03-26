import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/StatCard';
import { BarChart3, DollarSign, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FunderDashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [allInvoices, setAllInvoices] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all matched/funded invoices (available to funders)
  useEffect(() => {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['verified', 'bidding', 'funded', 'settled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const invoices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllInvoices(invoices);

      // Filter investments where this funder made an offer or was accepted
      if (user) {
        const mine = invoices.filter(inv =>
          inv.matchedFunders?.some(f => f.funderId === user.uid) ||
          inv.acceptedFunder?.funderId === user.uid
        );
        setMyInvestments(mine);
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const totalAvailable = allInvoices.filter(i => ['verified', 'bidding'].includes(i.status)).length;
  const myOffers = myInvestments.length;
  const accepted = myInvestments.filter(i => i.acceptedFunder?.funderId === user?.uid).length;
  const totalFunded = myInvestments
    .filter(i => i.acceptedFunder?.funderId === user?.uid)
    .reduce((sum, i) => sum + (i.acceptedFunder?.msmeReceives || i.amount || 0), 0);

  // Calculate average risk score from available invoices
  const invoicesWithRisk = allInvoices.filter(i => i.riskResult?.riskScore);
  const avgRisk = invoicesWithRisk.length > 0
    ? Math.round(invoicesWithRisk.reduce((sum, i) => sum + i.riskResult.riskScore, 0) / invoicesWithRisk.length)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('funder.dashboard_title')}</h1>
          <p className="text-surface-400 mt-1">{t('funder.dashboard_subtitle')}</p>
        </div>
        <Link
          to="/funder/invoices"
          className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          {t('funder.browse_invoices')} <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats from real data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label={t('funder.total_funded')} value={`₹${totalFunded >= 100000 ? (totalFunded / 100000).toFixed(1) + 'L' : totalFunded.toLocaleString('en-IN')}`} color="primary" />
        <StatCard icon={TrendingUp} label={t('funder.my_offers')} value={myOffers} color="accent" />
        <StatCard icon={Shield} label={t('funder.avg_risk')} value={`${avgRisk}/100`} color="warning" />
        <StatCard icon={BarChart3} label={t('funder.accepted')} value={accepted} color="accent" />
      </div>

      {/* Available Invoices Summary */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('funder.available_opps')}</h3>
        <p className="text-surface-400 text-sm mb-4">{totalAvailable} {t('funder.invoices_waiting')}</p>

        {allInvoices.filter(i => ['verified', 'bidding'].includes(i.status)).length === 0 ? (
          <p className="text-surface-500 text-sm">{t('funder.no_available')}</p>
        ) : (
          <div className="space-y-3">
            {allInvoices
              .filter(i => ['verified', 'bidding'].includes(i.status))
              .slice(0, 5)
              .map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-800/30 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                    <p className="text-xs text-surface-400">
                      ₹{(inv.amount || 0).toLocaleString('en-IN')} • {inv.buyerName || 'N/A'}
                      {inv.riskResult && <span className="ml-2">• {t('common.risk')}: {inv.riskResult.grade} ({inv.riskResult.riskScore})</span>}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    inv.matchedFunders?.some(f => f.funderId === user?.uid)
                      ? 'bg-accent-500/15 text-accent-400'
                      : 'bg-primary-500/15 text-primary-400'
                  }`}>
                    {inv.matchedFunders?.some(f => f.funderId === user?.uid) ? t('funder.offered') : t('funder.open')}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* My Investments */}
      {myInvestments.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('funder.my_investments')}</h3>
          <div className="space-y-3">
            {myInvestments.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-800/30 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                  <p className="text-xs text-surface-400">
                    ₹{(inv.acceptedFunder?.msmeReceives || inv.amount || 0).toLocaleString('en-IN')}
                    {inv.acceptedFunder && <span className="ml-2">• {t('common.rate')}: {inv.acceptedFunder.rate}%</span>}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  inv.status === 'settled' ? 'bg-accent-500/15 text-accent-400' :
                  inv.status === 'funded' ? 'bg-accent-500/15 text-accent-400' :
                  inv.status === 'accepted' ? 'bg-warning-500/15 text-warning-400' :
                  inv.status === 'bidding' ? 'bg-primary-500/15 text-primary-400' :
                  'bg-surface-700 text-surface-400'
                }`}>
                  {inv.status === 'settled' ? `${t('status.settled')} ✓` : inv.status === 'funded' ? `${t('status.funded')} ✓` : inv.status === 'accepted' ? t('status.accepted') : t('status.bidding')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
