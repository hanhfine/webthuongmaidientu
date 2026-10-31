const DEV_SECRET = 'dev-secret-change-me-dev-secret-change-me';

export function loadConfig(env) {
  const isDevLike = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  if (!env.JWT_SECRET && !isDevLike) {
    throw new Error('JWT_SECRET is required unless NODE_ENV is "development" or "test"');
  }

  const rawFee = env.SHIPPING_FEE === undefined || env.SHIPPING_FEE === '' ? '30000' : env.SHIPPING_FEE;
  if (!/^\d+$/.test(rawFee.trim())) {
    throw new Error(`SHIPPING_FEE must be a non-negative integer, got "${rawFee}"`);
  }

  return {
    env: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 4000),
    mongoUri: env.MONGODB_URI ?? 'mongodb://localhost:27017/?directConnection=true',
    dbName: env.NODE_ENV === 'test' ? 'webbanhang_test' : (env.DB_NAME ?? 'webbanhang'),
    jwtSecret: env.JWT_SECRET || DEV_SECRET,
    shippingFee: Number(rawFee),
    bank: {
      name: env.BANK_NAME ?? 'Vietcombank',
      account: env.BANK_ACCOUNT ?? '0123456789',
      holder: env.BANK_HOLDER ?? 'CUA HANG CONG NGHE',
    },
  };
}

export const config = loadConfig(process.env);
