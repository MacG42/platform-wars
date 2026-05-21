import { defineConfig } from 'vite';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGitHubPages ? './' : '/',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
