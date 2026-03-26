import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import { BarChart3, DollarSign, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FunderDashboard() {
  const { user } = useAuth();
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
          <h1 className="text-2xl font-bold text-white">Funder Dashboard</h1>
          <p className="text-surface-400 mt-1">Monitor your investment portfolio</p>
        </div>
        <Link
          to="/funder/invoices"
          className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          Browse Invoices <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats from real data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Funded" value={`₹${(totalFunded / 100000).toFixed(1)}L`} color="primary" />
        <StatCard icon={TrendingUp} label="My Offers" value={myOffers} color="accent" />
        <StatCard icon={Shield} label="Avg Risk Score" value={`${avgRisk}/100`} color="warning" />
        <StatCard icon={BarChart3} label="Accepted" value={accepted} color="accent" />
      </div>

      {/* Available Invoices Summary */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Available Opportunities</h3>
        <p className="text-surface-400 text-sm mb-4">{totalAvailable} invoices waiting for funding offers</p>

        {allInvoices.filter(i => ['verified', 'bidding'].includes(i.status)).length === 0 ? (
          <p className="text-surface-500 text-sm">No invoices available yet. Check back after buyers confirm invoices.</p>
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
                      {inv.riskResult && <span className="ml-2">• Risk: {inv.riskResult.grade} ({inv.riskResult.riskScore})</span>}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    inv.matchedFunders?.some(f => f.funderId === user?.uid)
                      ? 'bg-accent-500/15 text-accent-400'
                      : 'bg-primary-500/15 text-primary-400'
                  }`}>
                    {inv.matchedFunders?.some(f => f.funderId === user?.uid) ? 'Offered' : 'Open'}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* My Investments */}
      {myInvestments.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">My Investments</h3>
          <div className="space-y-3">
            {myInvestments.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-800/30 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0,8)}</p>
                  <p className="text-xs text-surface-400">
                    ₹{(inv.amount || 0).toLocaleString('en-IN')}
                    {inv.acceptedFunder && <span className="ml-2">• Rate: {inv.acceptedFunder.rate}%</span>}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  inv.status === 'funded' ? 'bg-accent-500/15 text-accent-400' :
                  inv.status === 'bidding' ? 'bg-warning-500/15 text-warning-400' :
                  'bg-surface-700 text-surface-400'
                }`}>
                  {inv.status === 'funded' ? 'Funded ✓' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
