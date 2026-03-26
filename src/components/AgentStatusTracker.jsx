import { CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

const stages = [
  { key: 'upload', label: 'Invoice Upload', description: 'MSME uploads invoice for AI verification' },
  { key: 'verification', label: 'Buyer Verification', description: 'Buyer confirms invoice details & identity' },
  { key: 'risk', label: 'Risk Assessment', description: 'AI analyzes buyer creditworthiness' },
  { key: 'bidding', label: 'Funder Bidding', description: 'Funders place discount bids on invoice' },
  { key: 'acceptance', label: 'MSME Acceptance', description: 'MSME reviews and accepts a funder bid' },
  { key: 'funding', label: 'Funder Disbursement', description: 'Funder pays discounted amount to MSME' },
  { key: 'settlement', label: 'Settlement', description: 'Buyer pays full invoice amount to funder' },
];

const stageIcons = {
  completed: <CheckCircle size={20} className="text-accent-400" />,
  active: <Loader2 size={20} className="text-primary-400 animate-spin" />,
  pending: <Clock size={20} className="text-surface-500" />,
  failed: <AlertCircle size={20} className="text-danger-400" />,
};

export default function AgentStatusTracker({ currentStage = 0, stageStatuses = {} }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Agent Pipeline</h3>
      <div className="relative">
        {stages.map((stage, index) => {
          const status = stageStatuses[stage.key] ||
            (index < currentStage ? 'completed' : index === currentStage ? 'active' : 'pending');

          return (
            <div key={stage.key} className="flex items-start mb-8 last:mb-0 relative">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div className={`absolute left-[15px] top-[36px] w-0.5 h-[calc(100%)] ${status === 'completed' ? 'bg-accent-500/40' : 'bg-surface-700'
                  }`} />
              )}

              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 z-10 ${status === 'completed' ? 'bg-accent-500/15' :
                  status === 'active' ? 'bg-primary-500/15 animate-pulse-glow' :
                    status === 'failed' ? 'bg-danger-500/15' :
                      'bg-surface-800'
                }`}>
                {stageIcons[status]}
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className={`font-medium ${status === 'completed' ? 'text-accent-400' :
                    status === 'active' ? 'text-primary-400' :
                      status === 'failed' ? 'text-danger-400' :
                        'text-surface-500'
                  }`}>
                  {stage.label}
                </p>
                <p className="text-sm text-surface-500 mt-0.5">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
