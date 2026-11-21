const DEV_SECRET = 'dev-secret-change-me-dev-secret-change-me';

export function loadConfig(env) {
  const isDevLike = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  const jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!jwtSecret && !isDevLike) {
    throw new Error('JWT_SECRET is required unless NODE_ENV is "development" or "test"');
  }

  const rawPort = env.PORT === undefined || env.PORT === '' ? '4000' : String(env.PORT);
  if (!/^\d+$/.test(rawPort.trim()) || Number(rawPort) < 1) {
    throw new Error(`PORT must be a positive integer, got "${rawPort}"`);
  }

  const rawFee = env.SHIPPING_FEE === undefined || env.SHIPPING_FEE === '' ? '30000' : String(env.SHIPPING_FEE);
  if (!/^\d+$/.test(rawFee.trim())) {
    throw new Error(`SHIPPING_FEE must be a non-negative integer, got "${rawFee}"`);
  }

  return {
    env: env.NODE_ENV ?? 'production',
    port: Number(rawPort),
    mongoUri: env.MONGODB_URI ?? 'mongodb://localhost:27017/?directConnection=true',
    dbName: env.NODE_ENV === 'test' ? 'webbanhang_test' : (env.DB_NAME ?? 'webbanhang'),
    jwtSecret: jwtSecret || DEV_SECRET,
    shippingFee: Number(rawFee),
    forceHttps: env.FORCE_HTTPS === 'true' || env.FORCE_HTTPS === '1',
    sslKeyPath: env.SSL_KEY_PATH ? String(env.SSL_KEY_PATH).trim() : '',
    sslCertPath: env.SSL_CERT_PATH ? String(env.SSL_CERT_PATH).trim() : '',
    bank: {
      name: env.BANK_NAME ?? 'Vietcombank',
      account: env.BANK_ACCOUNT ?? '0123456789',
      holder: env.BANK_HOLDER ?? 'CUA HANG CONG NGHE',
    },
  };
}

export const config = loadConfig(process.env);
