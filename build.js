import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Build the server with proper ESM configuration
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
      'sqlite3'
    ],
    packages: 'external',
    sourcemap: true,
    tsconfig: 'tsconfig.json',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    banner: {
      js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
      `.trim()
    }
  });

  console.log('Server build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}