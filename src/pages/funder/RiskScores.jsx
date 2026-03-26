import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';

// Real buyer database
const BUYER_DB = {
  'XYZ Industries':       { creditScore: 78, paymentHistory: 'GOOD',      avgPaymentDays: 30 },
  'Chennai Constructions': { creditScore: 65, paymentHistory: 'AVERAGE',   avgPaymentDays: 45 },
  'FastMove Logistics':   { creditScore: 82, paymentHistory: 'EXCELLENT',  avgPaymentDays: 25 },
};

export default function RiskScores() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['verified', 'bidding', 'funded', 'settled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // Extract unique buyers from invoices and merge with BUYER_DB
  const buyerMap = {};
  invoices.forEach(inv => {
    const name = inv.buyerName;
    if (!name) return;
    if (!buyerMap[name]) {
      const dbData = BUYER_DB[name] || {};
      buyerMap[name] = {
        name,
        gstin: inv.buyerGSTIN || 'N/A',
        creditScore: inv.riskResult?.buyerCreditScore || dbData.creditScore || null,
        paymentHistory: inv.riskResult?.paymentHistory || dbData.paymentHistory || 'UNKNOWN',
        avgPayDays: inv.riskResult?.avgPaymentDays || dbData.avgPaymentDays || null,
        grade: inv.riskResult?.grade || 'N/A',
        riskScore: inv.riskResult?.riskScore || null,
        invoiceCount: 0,
        totalAmount: 0,
      };
    }
    buyerMap[name].invoiceCount++;
    buyerMap[name].totalAmount += (inv.amount || 0);
  });

  const buyers = Object.values(buyerMap).sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

  const getScoreColor = (score) => {
    if (!score) return 'text-surface-400';
    if (score >= 75) return 'text-accent-400';
    if (score >= 55) return 'text-warning-400';
    return 'text-danger-400';
  };

  const getScoreBg = (score) => {
    if (!score) return 'bg-surface-700';
    if (score >= 75) return 'bg-accent-500/15';
    if (score >= 55) return 'bg-warning-500/15';
    return 'bg-danger-500/15';
  };

  const getGradeIcon = (score) => {
    if (!score) return <Shield size={16} className="text-surface-400" />;
    if (score >= 75) return <CheckCircle size={16} className="text-accent-400" />;
    if (score >= 55) return <TrendingUp size={16} className="text-warning-400" />;
    return <AlertTriangle size={16} className="text-danger-400" />;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t('funder.risk_title')}</h1>
        <p className="text-surface-400 mt-1">{t('funder.risk_subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : buyers.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Shield size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">{t('funder.no_buyer_data')}</p>
          <p className="text-surface-500 text-sm mt-2">{t('funder.risk_appear')}</p>
        </div>
      ) : (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">{t('funder.buyer_analysis')} ({buyers.length})</h3>
          <div className="space-y-3">
            {buyers.map((buyer, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-800/30 rounded-xl border border-surface-800 gap-4 hover:bg-surface-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${getScoreBg(buyer.riskScore)} flex items-center justify-center`}>
                    <span className={`text-lg font-bold ${getScoreColor(buyer.riskScore)}`}>
                      {buyer.riskScore || '—'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{buyer.name}</p>
                    <p className="text-xs text-surface-500 font-mono">{buyer.gstin}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-surface-500">{t('msme.grade')}</p>
                    <div className="flex items-center gap-1">
                      {getGradeIcon(buyer.riskScore)}
                      <span className={`text-sm font-bold ${getScoreColor(buyer.riskScore)}`}>{buyer.grade}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-surface-500">{t('funder.avg_pay_days')}</p>
                    <p className="text-sm font-bold text-white">{buyer.avgPayDays ? `${buyer.avgPayDays}d` : 'N/A'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-surface-500">{t('funder.history')}</p>
                    <p className={`text-sm font-medium ${
                      buyer.paymentHistory === 'EXCELLENT' ? 'text-accent-400' :
                      buyer.paymentHistory === 'GOOD' ? 'text-primary-400' :
                      buyer.paymentHistory === 'AVERAGE' ? 'text-warning-400' : 
                      buyer.paymentHistory === 'POOR' ? 'text-danger-400' : 'text-surface-400'
                    }`}>{buyer.paymentHistory}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-surface-500">{t('funder.invoices')}</p>
                    <p className="text-sm font-bold text-white">{buyer.invoiceCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-surface-500">{t('funder.total')}</p>
                    <p className="text-sm font-bold text-white">₹{(buyer.totalAmount / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
