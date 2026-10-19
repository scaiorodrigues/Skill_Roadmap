/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist tenta carregar "canvas" (só existe no Node); no navegador não é necessário.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
