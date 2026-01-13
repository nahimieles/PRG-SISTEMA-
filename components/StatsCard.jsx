export default function StatsCard({ number, label, bgColor = '#1a2e47' }) {
  return (
    <div 
      className="rounded-lg p-4 text-center text-white shadow-md"
      style={{ background: bgColor }}
    >
      <div className="text-3xl font-bold">{number}</div>
      <div className="text-sm opacity-90">{label}</div>
    </div>
  );
}