/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet's MapContainer throws "Map container is already initialized"
  // under React 18 Strict Mode's double-effect-invocation in dev. Prod builds
  // are unaffected (Strict Mode double-invoking is dev-only).
  reactStrictMode: false,
}
module.exports = nextConfig
