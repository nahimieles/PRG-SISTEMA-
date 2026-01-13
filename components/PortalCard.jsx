import Link from 'next/link';

export default function PortalCard({ href, icon, title, description, theme }) {
  return (
    <Link href={href}>
      <div
        className="rounded-xl shadow-xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl"
        style={{ background: theme.surface }}
      >
        <div
          className="rounded-lg p-6 mb-4 flex items-center justify-center text-white"
          style={{ background: theme.primary }}
        >
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center" style={{ color: theme.text }}>
          {title}
        </h3>
        <p style={{ color: theme.textSecondary }} className="text-center">{description}</p>
      </div>
    </Link>
  );
}