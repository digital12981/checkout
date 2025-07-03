#!/usr/bin/env node

import { execSync } from 'child_process';
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

console.log('🔨 Building for Heroku deployment...');

try {
  // 1. Build frontend assets
  console.log('📦 Building frontend...');
  execSync('npx vite build --mode production', { stdio: 'inherit' });

  // 2. Build server
  console.log('⚙️ Building server...');
  await build({
    entryPoints: ['server/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outdir: 'dist',
    external: [
      // Database drivers
      'pg-native',
      'better-sqlite3',
      'mysql2',
      'postgres',
      'tedious',
      'pg-query-stream',
      'oracledb',
      'sqlite3',
      // Vite and dev dependencies
      'vite',
      '@vitejs/plugin-react',
      '@replit/vite-plugin-cartographer',
      '@replit/vite-plugin-runtime-error-modal',
      'tsx',
      'typescript',
      'esbuild'
    ],
    packages: 'external',
    sourcemap: false,
    minify: true,
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

  // 3. Copy client build to public directory for server
  console.log('📁 Setting up static files...');
  const clientDistPath = path.resolve('client', 'dist');
  const publicPath = path.resolve('public');
  
  if (fs.existsSync(clientDistPath)) {
    if (fs.existsSync(publicPath)) {
      fs.rmSync(publicPath, { recursive: true });
    }
    fs.cpSync(clientDistPath, publicPath, { recursive: true });
    console.log('✅ Static files copied to public/');
  }

  console.log('🎉 Build completed successfully!');
  console.log('📋 Ready for Heroku deployment');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}