import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import { TrendingUp, DollarSign, BarChart3, Shield, FileText } from 'lucide-react';

export default function PortfolioPerformance() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'invoices'),
      where('status', 'in', ['bidding', 'funded', 'settled'])
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

  const funded = investments.filter(i => i.acceptedFunder?.funderId === user?.uid);
  const totalProfit = funded.reduce((sum, i) => {
    const invoiceAmt = i.amount || 0;
    const paid = i.acceptedFunder?.msmeReceives || invoiceAmt;
    return sum + (invoiceAmt - paid);
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
        <StatCard icon={DollarSign} label="Total Profit" value={`₹${totalProfit >= 100000 ? (totalProfit / 100000).toFixed(1) + 'L' : totalProfit.toLocaleString('en-IN')}`} color="accent" />
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
          {/* Funded Invoices */}
          {funded.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Funded Invoices ({funded.length})</h3>
              <div className="space-y-3">
                {funded.map(inv => (
                  <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-800/30 rounded-xl gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                      <p className="text-xs text-surface-400">Buyer: {inv.buyerName || 'N/A'}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-surface-500">Amount</p>
                        <p className="text-sm font-bold text-white">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-surface-500">Rate</p>
                        <p className="text-sm font-bold text-accent-400">{inv.acceptedFunder?.rate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-surface-500">Risk</p>
                        <p className="text-sm font-bold text-warning-400">{inv.riskResult?.grade || 'N/A'}</p>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-accent-500/15 text-accent-400">
                        Funded ✓
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Offers (made offer but not yet accepted by MSME) */}
          {investments.filter(i => i.acceptedFunder?.funderId !== user?.uid && i.status === 'bidding').length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Pending Offers</h3>
              <div className="space-y-3">
                {investments
                  .filter(i => i.acceptedFunder?.funderId !== user?.uid && i.status === 'bidding')
                  .map(inv => {
                    const myOffer = inv.matchedFunders?.find(f => f.funderId === user?.uid);
                    return (
                      <div key={inv.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-800/30 rounded-xl gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                          <p className="text-xs text-surface-400">Buyer: {inv.buyerName || 'N/A'} • ₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-surface-500">My Rate</p>
                            <p className="text-sm font-bold text-primary-400">{myOffer?.rate || '—'}%</p>
                          </div>
                          <span className="text-xs px-3 py-1 rounded-full font-medium bg-warning-500/15 text-warning-400">
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
