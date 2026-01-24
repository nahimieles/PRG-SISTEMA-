export default function StatsCard({ number, label, bgColor = 'hsl(220, 55%, 48%)', icon }) {
  return (
    <div
      className="group relative rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 100%)`
      }}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-500" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {icon && (
          <div className="mb-2 sm:mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
            {icon}
          </div>
        )}
        <div className="text-3xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300 origin-left">
          {number}
        </div>
        <div className="text-xs sm:text-sm opacity-90 font-medium uppercase tracking-wide">
          {label}
        </div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </div>
  );
}

// Helper function to darken color
function adjustColor(color, percent) {
  // Simple darkening for HSL colors
  if (color.startsWith('hsl')) {
    return color.replace(/(\d+)%\)/, (match, p1) => {
      const newValue = Math.max(0, parseInt(p1) + percent);
      return `${newValue}%)`;
    });
  }
  return color;
}