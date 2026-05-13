const nextConfig: NextConfig = {
  // ... existing config ...

  typescript: {
    ignoreBuildErrors: true,
  },
  // REMOVE this entire block:
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
};
