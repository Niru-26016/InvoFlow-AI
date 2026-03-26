const statusConfig = {
  pending: { label: 'Pending', color: 'bg-warning-500/15 text-warning-400 border-warning-500/30' },
  verifying: { label: 'Verifying', color: 'bg-primary-500/15 text-primary-400 border-primary-500/30' },
  verified: { label: 'Verified', color: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
  rejected: { label: 'Rejected', color: 'bg-danger-500/15 text-danger-400 border-danger-500/30' },
  funded: { label: 'Funded', color: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
  bidding: { label: 'Bidding', color: 'bg-primary-500/15 text-primary-400 border-primary-500/30' },
  settled: { label: 'Settled', color: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
  overdue: { label: 'Overdue', color: 'bg-danger-500/15 text-danger-400 border-danger-500/30' },
  confirmed: { label: 'Confirmed', color: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
  awaiting: { label: 'Awaiting', color: 'bg-warning-500/15 text-warning-400 border-warning-500/30' },
  accepted: { label: 'Accepted', color: 'bg-primary-500/15 text-primary-400 border-primary-500/30' },
  authentic: { label: '✅ Authentic', color: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
  suspicious: { label: '⚠️ Suspicious', color: 'bg-warning-500/15 text-warning-400 border-warning-500/30' },
  escrow_funded: { label: 'In Escrow', color: 'bg-primary-500/15 text-primary-400 border-primary-500/30' },
  escrow_settled: { label: 'Escrow Settled', color: 'bg-accent-500/15 text-accent-400 border-accent-500/30' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${config.color.includes('accent') ? 'bg-accent-400' : config.color.includes('primary') ? 'bg-primary-400' : config.color.includes('warning') ? 'bg-warning-400' : 'bg-danger-400'}`} />
      {config.label}
    </span>
  );
}
