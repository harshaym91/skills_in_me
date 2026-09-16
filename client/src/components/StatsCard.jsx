export default function StatsCard({ label, value, accent }) { return <div className={`stat-card ${accent || ''}`}><span>{label}</span><strong>{value}</strong></div>; }
