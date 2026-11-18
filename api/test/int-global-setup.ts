import { execSync } from 'node:child_process';
import { config } from 'dotenv';

/** Testler başlamadan önce bir kez çalışır: test veritabanına migration'ları uygular */
export default function setup() {
  const { DATABASE_URL } = config({ path: '.env.test', quiet: true }).parsed ?? {};
  if (!DATABASE_URL?.includes('_test')) {
    throw new Error('.env.test içindeki DATABASE_URL bir test veritabanını (_test) göstermeli');
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL },
  });
}