import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { DollarSign, CheckCircle, Building, Trophy, ArrowDown } from 'lucide-react';

export default function FundingOffers() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'invoices'),
      where('msmeId', '==', user.uid),
      where('status', 'in', ['matched', 'funded'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleAcceptOffer = async (invoiceId, funder) => {
    setAcceptingId(invoiceId + funder.funderId);
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'funded',
        acceptedFunder: funder,
        fundedAt: new Date().toISOString(),
        agentStage: 4,
        'stageStatuses.settlement': 'completed'
      });
    } catch (err) {
      alert('Failed to accept: ' + err.message);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Funding Offers</h1>
        <p className="text-surface-400 mt-1">Review bids from funders and accept the best discount rate</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <DollarSign size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No funding offers yet</p>
          <p className="text-surface-500 text-sm mt-2">Offers appear after your invoices are verified and funders place bids</p>
        </div>
      ) : (
        <div className="space-y-6">
          {invoices.map((inv) => {
            // Sort bids by lowest rate first (best deal for MSME)
            const sortedFunders = [...(inv.matchedFunders || [])].sort((a, b) => a.rate - b.rate);
            const lowestRate = sortedFunders[0]?.rate;

            return (
              <div key={inv.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{inv.invoiceNumber}</h3>
                    <p className="text-surface-400 text-sm">
                      Buyer: {inv.buyerName} • Invoice: ₹{(inv.amount || 0).toLocaleString('en-IN')}
                      {inv.riskResult && <span className="ml-2">• Risk: {inv.riskResult.grade}</span>}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>

                {/* Already accepted */}
                {inv.acceptedFunder && (
                  <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20 mb-4">
                    <p className="text-sm text-accent-400 font-semibold flex items-center gap-2">
                      <CheckCircle size={16} /> Accepted: {inv.acceptedFunder.name} at {inv.acceptedFunder.rate}% discount
                    </p>
                    <p className="text-xs text-surface-400 mt-1">
                      You receive: ₹{(inv.acceptedFunder.msmeReceives || (inv.amount - Math.round(inv.amount * inv.acceptedFunder.rate / 100))).toLocaleString('en-IN')}
                      {' '}• Discount: ₹{(inv.acceptedFunder.discountAmount || Math.round(inv.amount * inv.acceptedFunder.rate / 100)).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}

                {/* Funder bids */}
                {sortedFunders.length > 0 && !inv.acceptedFunder ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowDown size={14} className="text-surface-400" />
                      <p className="text-sm font-medium text-surface-300">
                        {sortedFunders.length} bid{sortedFunders.length > 1 ? 's' : ''} — sorted by lowest rate (best for you)
                      </p>
                    </div>
                    {sortedFunders.map((funder, idx) => {
                      const isBest = funder.rate === lowestRate;
                      const discount = Math.round(inv.amount * (funder.rate / 100));
                      const msmeGets = inv.amount - discount;

                      return (
                        <div key={idx} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl gap-3 ${
                          isBest ? 'bg-accent-500/10 border border-accent-500/20' : 'bg-surface-800/50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isBest ? 'bg-accent-500/15' : 'bg-primary-500/15'
                            }`}>
                              {isBest ? <Trophy size={18} className="text-accent-400" /> : <Building size={18} className="text-primary-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white flex items-center gap-2">
                                {funder.name}
                                {isBest && <span className="text-xs px-2 py-0.5 bg-accent-500/20 text-accent-400 rounded-full">Best Rate</span>}
                              </p>
                              <p className="text-xs text-surface-400">{funder.type || 'Funder'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-xs text-surface-500">Discount</p>
                              <p className={`text-sm font-bold ${isBest ? 'text-accent-400' : 'text-white'}`}>{funder.rate}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-surface-500">You Receive</p>
                              <p className="text-sm font-bold text-white">₹{msmeGets.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-surface-500">Fee</p>
                              <p className="text-sm font-medium text-surface-400">₹{discount.toLocaleString('en-IN')}</p>
                            </div>
                            <button
                              onClick={() => handleAcceptOffer(inv.id, { ...funder, msmeReceives: msmeGets, discountAmount: discount })}
                              disabled={acceptingId === inv.id + funder.funderId}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-all ${
                                isBest
                                  ? 'gradient-accent text-white hover:opacity-90'
                                  : 'bg-primary-500/15 border border-primary-500/30 text-primary-400 hover:bg-primary-500/25'
                              } disabled:opacity-50`}
                            >
                              {acceptingId === inv.id + funder.funderId ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <><CheckCircle size={14} /> Accept</>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !inv.acceptedFunder ? (
                  <p className="text-surface-500 text-sm">Waiting for funders to place bids...</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
