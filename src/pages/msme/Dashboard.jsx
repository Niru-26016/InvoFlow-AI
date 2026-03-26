import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { FileText, DollarSign, CheckCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MSMEDashboard() {
  const { user } = useAuth();
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
          <h1 className="text-2xl font-bold text-white">MSME Dashboard</h1>
          <p className="text-surface-400 mt-1">Manage your invoices and track financing</p>
        </div>
        <Link
          to="/msme/upload"
          className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          Upload Invoice <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Invoices" value={stats.total} color="primary" />
        <StatCard icon={CheckCircle} label="Verified" value={stats.verified} color="accent" />
        <StatCard icon={DollarSign} label="Funded" value={stats.funded} color="warning" />
        <StatCard icon={TrendingUp} label="Total Value" value={`₹${(stats.totalAmount / 100000).toFixed(1)}L`} color="primary" />
      </div>

      {/* Recent Invoices */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
          <Link to="/msme/verification" className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">No invoices yet</p>
            <Link to="/msme/upload" className="text-primary-400 text-sm font-medium mt-2 inline-block">
              Upload your first invoice →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Buyer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors">
                    <td className="py-3 px-4 text-sm text-white font-medium">{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                    <td className="py-3 px-4 text-sm text-surface-300">{inv.buyerName || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-white font-medium">₹{(inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4"><StatusBadge status={inv.status || 'pending'} /></td>
                    <td className="py-3 px-4 text-sm text-surface-400">
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
