import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import AgentStatusTracker from '../../components/AgentStatusTracker';
import StatusBadge from '../../components/StatusBadge';
import { FileText, Eye } from 'lucide-react';

export default function VerificationStatus() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'invoices'),
      where('msmeId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setInvoices(data);
      if (!selectedInvoice && data.length > 0) setSelectedInvoice(data[0]);
      else if (selectedInvoice) {
        const updated = data.find(d => d.id === selectedInvoice.id);
        if (updated) setSelectedInvoice(updated);
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t('msme.verification_title')}</h1>
        <p className="text-surface-400 mt-1">{t('msme.verification_subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">{t('msme.no_invoices_track')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice list */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">{t('msme.your_invoices')}</h3>
            {invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  selectedInvoice?.id === inv.id
                    ? 'glass-card border-primary-500/30 glow-primary'
                    : 'bg-surface-800/30 border border-surface-800 hover:bg-surface-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">{inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                  <StatusBadge status={inv.status || 'pending'} />
                </div>
                <p className="text-sm text-surface-400">{inv.buyerName}</p>
                <p className="text-sm font-medium text-primary-400 mt-1">₹{(inv.amount || 0).toLocaleString('en-IN')}</p>
              </button>
            ))}
          </div>

          {/* Agent status detail */}
          <div className="lg:col-span-2 space-y-6">
            {selectedInvoice && (
              <>
                {/* Invoice summary */}
                <div className="glass-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedInvoice.invoiceNumber}</h3>
                      <p className="text-surface-400 mt-1">{t('common.buyer')}: {selectedInvoice.buyerName}</p>
                    </div>
                    <StatusBadge status={selectedInvoice.status || 'pending'} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="bg-surface-800/50 p-3 rounded-xl">
                      <p className="text-xs text-surface-500 mb-1">{t('common.amount')}</p>
                      <p className="text-sm font-bold text-white">₹{(selectedInvoice.amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-surface-800/50 p-3 rounded-xl">
                      <p className="text-xs text-surface-500 mb-1">{t('common.gstin')}</p>
                      <p className="text-sm font-medium text-white">{selectedInvoice.buyerGSTIN || 'N/A'}</p>
                    </div>
                    <div className="bg-surface-800/50 p-3 rounded-xl">
                      <p className="text-xs text-surface-500 mb-1">{t('common.due_date')}</p>
                      <p className="text-sm font-medium text-white">{selectedInvoice.dueDate || 'N/A'}</p>
                    </div>
                    <div className="bg-surface-800/50 p-3 rounded-xl">
                      <p className="text-xs text-surface-500 mb-1">{t('common.submitted')}</p>
                      <p className="text-sm font-medium text-white">
                        {selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Agent pipeline */}
                <AgentStatusTracker 
                  currentStage={selectedInvoice.agentStage || 0} 
                  stageStatuses={selectedInvoice.stageStatuses || {}} 
                />

                {/* Agent outputs */}
                {(selectedInvoice.verificationResult || selectedInvoice.riskResult) && (
                  <div className="glass-card p-6 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('msme.agent_outputs')}</h3>
                    <div className="space-y-3">
                      {selectedInvoice.verificationResult && (
                        <div className="bg-surface-800/50 p-4 rounded-xl">
                          <p className="text-xs text-accent-400 font-semibold mb-1">{t('msme.invoice_verification')}</p>
                          <p className="text-sm text-surface-300">
                            {t('msme.confidence')}: {(selectedInvoice.verificationResult.confidence * 100).toFixed(0)}% — 
                            {selectedInvoice.verificationResult.verified ? ` ${t('status.verified')} ✓` : ` ${t('status.rejected')} ✗`}
                          </p>
                          {selectedInvoice.verificationResult.message && (
                            <p className="text-xs text-surface-500 mt-1 italic">{selectedInvoice.verificationResult.message}</p>
                          )}
                          {selectedInvoice.verificationResult.extractedData && (
                            <div className="mt-3 text-xs text-blue-300 bg-blue-500/10 p-3 rounded-lg border border-blue-400/20">
                              <p className="font-semibold text-surface-300 mb-1">{t('msme.extracted_readout')}:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                <li>{t('msme.buyer_name')}: {selectedInvoice.verificationResult.extractedData.buyerName || 'N/A'}</li>
                                <li>{t('common.gstin')}: {selectedInvoice.verificationResult.extractedData.buyerGSTIN || 'N/A'}</li>
                                <li>{t('common.invoice_number')}: {selectedInvoice.verificationResult.extractedData.invoiceNumber || 'N/A'}</li>
                                <li>{t('common.amount')}: ₹{selectedInvoice.verificationResult.extractedData.amount || 'N/A'}</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {selectedInvoice.riskResult && (
                        <div className="bg-surface-800/50 p-4 rounded-xl">
                          <p className="text-xs text-primary-400 font-semibold mb-1">{t('msme.buyer_risk_score')}</p>
                          <p className="text-sm text-surface-300">
                            {t('msme.score')}: {selectedInvoice.riskResult.riskScore}/100 — {t('msme.grade')}: {selectedInvoice.riskResult.grade}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
