export default function StatCard({ icon: Icon, label, value, change, changeType = 'positive', color = 'primary' }) {
  const colorMap = {
    primary: 'from-primary-600/20 to-primary-800/10 border-primary-500/20',
    accent: 'from-accent-600/20 to-accent-800/10 border-accent-500/20',
    warning: 'from-warning-500/20 to-warning-500/5 border-warning-500/20',
    danger: 'from-danger-500/20 to-danger-500/5 border-danger-500/20',
  };

  const iconColorMap = {
    primary: 'text-primary-400 bg-primary-500/15',
    accent: 'text-accent-400 bg-accent-500/15',
    warning: 'text-warning-400 bg-warning-500/15',
    danger: 'text-danger-400 bg-danger-500/15',
  };

  return (
    <div className={`glass-card bg-gradient-to-br ${colorMap[color]} p-6 transition-all duration-300 hover:scale-[1.02] hover:glow-primary`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColorMap[color]}`}>
          <Icon size={22} />
        </div>
        {change && (
          <span className={`text-sm font-medium px-2 py-1 rounded-full ${
            changeType === 'positive' 
              ? 'text-accent-400 bg-accent-500/10' 
              : 'text-danger-400 bg-danger-500/10'
          }`}>
            {changeType === 'positive' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <p className="text-surface-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--th-text)' }}>{value}</p>
    </div>
  );
}
