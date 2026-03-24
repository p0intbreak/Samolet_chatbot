/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  basePath: isGithubPages ? '/Samolet_chatbot' : '',
  assetPrefix: isGithubPages ? '/Samolet_chatbot/' : undefined
};

module.exports = nextConfig;

