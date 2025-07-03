import { build } from 'esbuild';

try {
  await build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outdir: 'dist',
    external: [
      'pg-native',
      'better-sqlite3', 
      'mysql2',
      'postgres',
      'tedious',
      'pg-query-stream',
      'oracledb',
      'sqlite3',
      'vite',
      '@vitejs/plugin-react',
      '@replit/vite-plugin-cartographer',
      '@replit/vite-plugin-runtime-error-modal'
    ],
    packages: 'external',
    sourcemap: false,
    minify: true,
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });

  console.log('Server build completed!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}