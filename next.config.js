/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Using default Vercel deployment (not static export)
  // This allows dynamic features like client-side data fetching
}

module.exports = nextConfig