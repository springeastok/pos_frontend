/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Azure用の設定
  output: 'standalone',
  distDir: '.next',
  // 環境変数
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // 画像の最適化を無効化（Azureでは必要）
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
