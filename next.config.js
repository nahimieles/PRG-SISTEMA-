/** @type {import('next').NextConfig} */
const nextConfig = {
  // Headers for MSAL popup authentication to work correctly
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig