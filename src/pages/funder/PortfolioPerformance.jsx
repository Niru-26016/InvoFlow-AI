import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import StatCard from '../../components/StatCard';
import { TrendingUp, DollarSign, BarChart3, Shield, FileText, Banknote, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { logToLedger } from '../../services/blockchainService';
import { doc, updateDoc } from 'firebase/firestore';

const PLATFORM_FEE_RATE = 0.015;

export default function PortfolioPerformance() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const handleWithdraw = async (invoice) => {
    setWithdrawingId(invoice.id);
    try {
      const platformFee = invoice.acceptedFunder?.platformFee || Math.round((invoice.amount || 0) * PLATFORM_FEE_RATE);
      const withdrawAmount = (invoice.amount || 0) - platformFee;

      await updateDoc(doc(db, 'invoices', invoice.id), {
        status: 'settled',
        'stageStatuses.settlement': 'completed',
        settlementPlatformFee: platformFee,
        settlementFunderReceived: withdrawAmount
      });

      // Log to blockchain
      await logToLedger(invoice.id, 'escrow_withdrawal_funder', {
        fromUser: 'Platform Escrow',
        fromName: 'Escrow',
        toUser: user.uid,
        toName: user.email?.split('@')[0] || 'Funder',
        invoiceNumber: invoice.invoiceNumber,
        amount: withdrawAmount,
        metadata: { platformFee, grossAmount: invoice.amount }
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
      where('status', 'in', ['bidding', 'accepted', 'funded', 'escrow_funded', 'escrow_settled', 'settled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Only show invoices where this funder participated
      const mine = all.filter(inv =>
        inv.matchedFunders?.some(f => f.funderId === user.uid) ||
        inv.acceptedFunder?.funderId === user.uid
      );
      setInvestments(mine);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const funded = investments.filter(i => i.acceptedFunder?.funderId === user?.uid && ['funded', 'escrow_funded', 'escrow_settled', 'settled'].includes(i.status));
  const escrowReturns = investments.filter(i => i.acceptedFunder?.funderId === user?.uid && i.status === 'escrow_settled');
  const totalProfit = funded.reduce((sum, i) => {
    const invoiceAmt = i.amount || 0;
    const paid = i.acceptedFunder?.msmeReceives || invoiceAmt;
    const fee = i.acceptedFunder?.platformFee || Math.round(invoiceAmt * PLATFORM_FEE_RATE);
    return sum + (invoiceAmt - paid - fee);
  }, 0);
  const avgRate = funded.length > 0
    ? (funded.reduce((sum, i) => sum + (i.acceptedFunder?.rate || 0), 0) / funded.length).toFixed(1)
    : '0';
  const totalOffers = investments.length;
  const acceptRate = totalOffers > 0 ? Math.round((funded.length / totalOffers) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio Performance</h1>
        <p className="text-surface-400 mt-1">Track your investment returns and analytics</p>
      </div>

      {/* Stats from real Firestore data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Net Profit" value={`₹${totalProfit >= 100000 ? (totalProfit / 100000).toFixed(1) + 'L' : totalProfit.toLocaleString('en-IN')}`} color="accent" />
        <StatCard icon={TrendingUp} label="Avg Rate" value={`${avgRate}%`} color="accent" />
        <StatCard icon={BarChart3} label="Total Offers" value={totalOffers} color="warning" />
        <StatCard icon={Shield} label="Accept Rate" value={`${acceptRate}%`} color="accent" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : investments.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No investments yet</p>
          <p className="text-surface-500 text-sm mt-2">Make offers on verified invoices to build your portfolio</p>
        </div>
      ) : (
        <>
          {/* Escrow Returns */}
          {escrowReturns.length > 0 && (
            <div className="mb-8 p-6 rounded-xl border" style={{ background: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--th-text)' }}>Escrow Returns</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 font-medium">
                  Ready to Withdraw ({escrowReturns.length})
                </span>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--th-text-muted)' }}>
                Buyers have paid these invoices into the platform escrow. Withdraw your principal + profit to your bank account.
              </p>

              <div className="space-y-3">
                {escrowReturns.map((inv) => {
                  const fee = inv.acceptedFunder?.platformFee || Math.round((inv.amount || 0) * PLATFORM_FEE_RATE);
                  const netWithdraw = (inv.amount || 0) - fee;
                  return (
                  <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border gap-4" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                        <ShieldCheck size={22} className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber}</p>
                        <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Buyer: {inv.buyerName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>₹{netWithdraw.toLocaleString('en-IN')}</p>
                        <p className="text-xs flex items-center gap-1 justify-end" style={{ color: 'var(--th-text-faint)' }}>
                          Invoice: ₹{(inv.amount || 0).toLocaleString('en-IN')} • <Zap size={10} /> Fee: ₹{fee.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleWithdraw(inv)}
                        disabled={withdrawingId === inv.id}
                        className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {withdrawingId === inv.id ? (
                          <Loader2 size={16} className="animate-spin text-white" />
                        ) : (
                          <><Banknote size={16} /> Withdraw ₹{netWithdraw.toLocaleString('en-IN')}</>
                        )}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Funded Invoices */}
          {funded.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--th-text)' }}>Funded Invoices ({funded.length})</h3>
              <div className="space-y-3">
                {funded.map(inv => (
                  <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl gap-4" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                      <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Buyer: {inv.buyerName || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Amount</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Rate</p>
                        <p className="text-sm font-bold text-accent-400">{inv.acceptedFunder?.rate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Risk</p>
                        <p className="text-sm font-bold text-warning-400">{inv.riskResult?.grade || 'N/A'}</p>
                      </div>
                      <div className="text-center ml-4">
                        <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Status</p>
                        <p className={`text-sm font-bold ${
                          inv.status === 'settled' ? 'text-accent-400' :
                          inv.status === 'escrow_settled' ? 'text-primary-400' :
                          'text-warning-400'
                        }`}>
                          {inv.status === 'settled' ? 'Settled ✓' :
                           inv.status === 'escrow_settled' ? 'In Escrow' :
                           'Funded'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Offers (made offer but not yet accepted by MSME) */}
          {investments.filter(i => i.acceptedFunder?.funderId !== user?.uid && i.status === 'bidding').length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--th-text)' }}>Pending Offers</h3>
              <div className="space-y-3">
                {investments
                  .filter(i => i.acceptedFunder?.funderId !== user?.uid && i.status === 'bidding')
                  .map(inv => {
                    const myOffer = inv.matchedFunders?.find(f => f.funderId === user?.uid);
                    return (
                      <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl gap-4" style={{ background: 'var(--th-bg)', borderColor: 'var(--th-border-subtle)' }}>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                          <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Buyer: {inv.buyerName || 'N/A'} • ₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>My Rate</p>
                            <p className="text-sm font-bold text-primary-400">{myOffer?.rate || '—'}%</p>
                          </div>
                          <span className="text-xs px-3 py-1 rounded-full font-medium bg-warning-500/15 text-warning-500 dark:text-warning-400">
                            Awaiting MSME
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
