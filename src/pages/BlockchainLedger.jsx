import { useState, useEffect } from 'react';
import { getFullChain, verifyChain, ACTION_LABELS } from '../services/blockchainService';
import { Shield, CheckCircle, XCircle, RefreshCw, Link2, Hash, Clock, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function BlockchainLedger() {
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [expanded, setExpanded] = useState({});

  const fetchChain = async () => {
    setLoading(true);
    const data = await getFullChain();
    setChain(data);
    setLoading(false);
  };

  useEffect(() => { fetchChain(); }, []);

  const handleVerify = async () => {
    setVerifying(true);
    const result = await verifyChain();
    setVerifyResult(result);
    setVerifying(false);
  };

  const toggleExpand = (idx) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getActionStyle = (action) => {
    const config = ACTION_LABELS[action] || { label: action, color: 'primary', emoji: '🔗' };
    const colorMap = {
      primary: { bg: 'bg-primary-500/15', text: 'text-primary-400', border: 'border-primary-500/30' },
      accent: { bg: 'bg-accent-500/15', text: 'text-accent-400', border: 'border-accent-500/30' },
      warning: { bg: 'bg-warning-500/15', text: 'text-warning-400', border: 'border-warning-500/30' },
      danger: { bg: 'bg-danger-500/15', text: 'text-danger-400', border: 'border-danger-500/30' },
    };
    return { ...config, ...colorMap[config.color] };
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">⛓️</span> Blockchain Ledger
          </h1>
          <p className="text-surface-400 mt-1">Immutable audit trail of all invoice transactions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchChain}
            className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
            style={{ background: 'var(--th-bg-card)', border: '1px solid var(--th-border)', color: 'var(--th-text-muted)' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying || chain.length === 0}
            className="px-5 py-2.5 gradient-primary rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          >
            {verifying ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Shield size={16} />
            )}
            Verify Chain
          </button>
        </div>
      </div>

      {/* Verification Result */}
      {verifyResult && (
        <div className={`glass-card p-4 mb-6 border ${verifyResult.valid ? 'border-accent-500/30 bg-accent-500/5' : 'border-danger-500/30 bg-danger-500/5'}`}>
          <div className="flex items-center gap-3">
            {verifyResult.valid ? (
              <CheckCircle size={20} className="text-accent-400" />
            ) : (
              <XCircle size={20} className="text-danger-400" />
            )}
            <div>
              <p className={`text-sm font-semibold ${verifyResult.valid ? 'text-accent-400' : 'text-danger-400'}`}>
                {verifyResult.valid ? 'Chain Integrity: Valid' : 'Chain Integrity: BROKEN'}
              </p>
              <p className="text-xs text-surface-400 mt-0.5">{verifyResult.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{chain.length}</p>
          <p className="text-xs text-surface-400 mt-1">Total Blocks</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-accent-400">
            {chain.filter(b => b.action === 'invoice_verified').length}
          </p>
          <p className="text-xs text-surface-400 mt-1">Verified</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary-400">
            {chain.filter(b => b.action === 'payment_disbursed').length}
          </p>
          <p className="text-xs text-surface-400 mt-1">Disbursed</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-warning-400">
            {chain.filter(b => ['settlement_msme', 'settlement_funder'].includes(b.action)).length}
          </p>
          <p className="text-xs text-surface-400 mt-1">Settled</p>
        </div>
      </div>

      {/* Chain Visualization */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : chain.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Link2 size={48} className="text-surface-600 mx-auto mb-4" />
          <p className="text-surface-400 text-lg">No blocks in the chain yet</p>
          <p className="text-surface-500 text-sm mt-2">Transactions will appear here as invoices are processed</p>
        </div>
      ) : (
        <div className="relative">
          {/* Chain line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5" style={{ background: 'var(--th-border)' }} />

          <div className="space-y-4">
            {[...chain].reverse().map((block, idx) => {
              const style = getActionStyle(block.action);
              const isExpanded = expanded[block.blockIndex];

              return (
                <div key={block.id || idx} className="relative pl-14">
                  {/* Chain node */}
                  <div className={`absolute left-4 top-5 w-5 h-5 rounded-full border-2 ${style.border} ${style.bg} flex items-center justify-center z-10`}>
                    <div className={`w-2 h-2 rounded-full ${style.bg}`} />
                  </div>

                  <div className="glass-card p-5 hover:glow-primary transition-all duration-300">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Block header */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${style.bg} ${style.text} border ${style.border}`}>
                            {style.emoji} {style.label}
                          </span>
                          <span className="text-xs font-mono text-surface-500">Block #{block.blockIndex}</span>
                        </div>

                        {/* Invoice info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="flex items-center gap-1.5 text-white font-medium">
                            <FileText size={13} className="text-surface-400" />
                            {block.invoiceNumber || block.invoiceId?.slice(0, 8)}
                          </span>
                          {block.fromName && (
                            <span className="flex items-center gap-1.5 text-surface-300">
                              <User size={13} className="text-surface-400" />
                              {block.fromName}
                            </span>
                          )}
                          {block.toName && (
                            <span className="text-surface-400">→ {block.toName}</span>
                          )}
                          {block.amount > 0 && (
                            <span className="text-white font-semibold">
                              ₹{block.amount.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-surface-500">
                          <Clock size={11} />
                          {new Date(block.timestamp).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Expand button */}
                      <button
                        onClick={() => toggleExpand(block.blockIndex)}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--th-text-muted)' }}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Expanded: Hash details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid var(--th-border)' }}>
                        <div className="flex items-start gap-2">
                          <Hash size={13} className="text-primary-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-surface-500">Block Hash</p>
                            <p className="text-xs font-mono text-primary-400 break-all">{block.hash}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Link2 size={13} className="text-surface-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-surface-500">Previous Hash</p>
                            <p className="text-xs font-mono text-surface-400 break-all">{block.previousHash}</p>
                          </div>
                        </div>
                        {block.metadata && Object.keys(block.metadata).length > 0 && (
                          <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--th-bg-input)' }}>
                            <p className="text-xs text-surface-500 mb-1">Metadata</p>
                            <pre className="text-xs text-surface-300 overflow-x-auto">{JSON.stringify(block.metadata, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
