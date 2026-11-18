import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Testler .env yerine .env.test içindeki DATABASE_URL'i kullanır
const testEnv = config({ path: '.env.test', quiet: true }).parsed ?? {};

/** Gerçek veritabanıyla çalışan entegrasyon testleri: npm run test:int */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.int-spec.ts'],
    env: testEnv,
    // Test veritabanını en güncel migration'lara getirir (bir kez, testlerden önce)
    globalSetup: ['./test/int-global-setup.ts'],
    // Tüm test dosyaları aynı veritabanını kullanır: aynı anda değil, sırayla çalışsınlar
    fileParallelism: false,
    testTimeout: 15_000,
  },
});