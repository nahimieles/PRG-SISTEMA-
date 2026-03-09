import Link from 'next/link';

export default function PortalCard({ href, icon, title, description, theme }) {
  return (
    <Link href={href}>
      <div
        className="group relative rounded-xl shadow-lg p-6 sm:p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg overflow-hidden border-2 border-transparent hover:border-blue-400"
        style={{ background: theme.surface }}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Icon container with gradient */}
        <div
          className="relative rounded-xl p-4 sm:p-6 mb-4 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300"
          style={{
            background: 'linear-gradient(135deg, hsl(220, 55%, 48%) 0%, hsl(220, 60%, 38%) 100%)'
          }}
        >
          <div className="transform group-hover:rotate-12 transition-transform duration-300">
            {icon}
          </div>
        </div>

        {/* Title with gradient on hover */}
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-center group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300"
          style={{ color: theme.text }}>
          {title}
        </h3>

        <p style={{ color: theme.textSecondary }} className="text-sm sm:text-base text-center leading-relaxed">
          {description}
        </p>

        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </Link>
  );
}