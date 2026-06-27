import './StatCard.css';

export default function StatCard({ icon, label, value, sub, trend, className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card__icon-wrap">
        {icon}
      </div>
      <div className="stat-card__content">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value font-mono-data">{value}</span>
        {sub && <span className="stat-card__sub">{sub}</span>}
        {trend && (
          <span className={`stat-card__trend stat-card__trend--${trend.type}`}>
            {trend.type === 'up' ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
