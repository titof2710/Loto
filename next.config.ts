import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET || 'lotofiesta_secret_2024_xK9mP2nQ8vL5wR3j',
  },
};

export default nextConfig;
