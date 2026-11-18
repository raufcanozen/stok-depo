import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Testler .env yerine .env.test içindeki ayarları kullanır
const testEnv = config({ path: '.env.test', quiet: true }).parsed ?? {};

/** Uygulamayı gerçekten ayağa kaldırıp HTTP istekleri gönderen testler: npm run test:e2e */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: testEnv,
    globalSetup: ['./test/int-global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15_000,
  },
});