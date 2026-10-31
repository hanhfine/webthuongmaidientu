const env = process.env;

if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

export const config = {
  env: env.NODE_ENV ?? 'development',
  port: Number(env.PORT ?? 4000),
  mongoUri: env.MONGODB_URI ?? 'mongodb://localhost:27017/?directConnection=true',
  dbName: env.NODE_ENV === 'test' ? 'webbanhang_test' : (env.DB_NAME ?? 'webbanhang'),
  jwtSecret: env.JWT_SECRET ?? 'dev-secret-change-me-dev-secret-change-me',
  shippingFee: Number(env.SHIPPING_FEE ?? 30000),
  bank: {
    name: env.BANK_NAME ?? 'Vietcombank',
    account: env.BANK_ACCOUNT ?? '0123456789',
    holder: env.BANK_HOLDER ?? 'CUA HANG CONG NGHE',
  },
};
