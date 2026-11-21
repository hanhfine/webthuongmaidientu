const DEV_SECRET = 'dev-secret-change-me-dev-secret-change-me';

const BANK_CODE_MAP = {
  vietcombank: 'VCB',
  vcb: 'VCB',
  mbbank: 'MB',
  'mb bank': 'MB',
  mb: 'MB',
  techcombank: 'TCB',
  tcb: 'TCB',
  acb: 'ACB',
  vietinbank: 'ICB',
  icb: 'ICB',
  ctg: 'ICB',
  bidv: 'BIDV',
  vpbank: 'VPB',
  vpb: 'VPB',
  tpbank: 'TPB',
  tpb: 'TPB',
  sacombank: 'STB',
  stb: 'STB',
};

function deriveBankCode(bankName) {
  const normalized = String(bankName || '').trim().toLowerCase();
  return BANK_CODE_MAP[normalized] ?? 'VCB';
}

function parsePositiveInt(raw, fallback, name) {
  const str = raw === undefined || raw === '' ? String(fallback) : String(raw).trim();
  if (!/^\d+$/.test(str) || Number(str) < 1) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return Number(str);
}

export function loadConfig(env) {
  const isDevLike = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  const jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!jwtSecret && !isDevLike) {
    throw new Error('JWT_SECRET is required unless NODE_ENV is "development" or "test"');
  }

  const port = parsePositiveInt(env.PORT, 4000, 'PORT');

  const rawFee = env.SHIPPING_FEE === undefined || env.SHIPPING_FEE === '' ? '30000' : String(env.SHIPPING_FEE);
  if (!/^\d+$/.test(rawFee.trim())) {
    throw new Error(`SHIPPING_FEE must be a non-negative integer, got "${rawFee}"`);
  }

  const bankName = env.BANK_NAME ? String(env.BANK_NAME).trim() : 'Vietcombank';
  const rawBankCode = env.BANK_CODE ? String(env.BANK_CODE).trim().toUpperCase() : '';
  const bankCode = rawBankCode || deriveBankCode(bankName);

  const allowedIps = env.SEPAY_ALLOWED_IPS
    ? String(env.SEPAY_ALLOWED_IPS)
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean)
    : [];

  return {
    env: env.NODE_ENV ?? 'production',
    port,
    mongoUri: env.MONGODB_URI ?? 'mongodb://localhost:27017/?directConnection=true',
    dbName: env.NODE_ENV === 'test' ? 'webbanhang_test' : (env.DB_NAME ?? 'webbanhang'),
    jwtSecret: jwtSecret || DEV_SECRET,
    shippingFee: Number(rawFee),
    forceHttps: env.FORCE_HTTPS === 'true' || env.FORCE_HTTPS === '1',
    sslKeyPath: env.SSL_KEY_PATH ? String(env.SSL_KEY_PATH).trim() : '',
    sslCertPath: env.SSL_CERT_PATH ? String(env.SSL_CERT_PATH).trim() : '',
    bank: {
      name: bankName,
      code: bankCode,
      account: env.BANK_ACCOUNT ? String(env.BANK_ACCOUNT).trim() : '0123456789',
      holder: env.BANK_HOLDER ? String(env.BANK_HOLDER).trim() : 'CUA HANG CONG NGHE',
    },
    sepay: {
      webhookApiKey: env.SEPAY_WEBHOOK_API_KEY ? String(env.SEPAY_WEBHOOK_API_KEY).trim() : '',
      userApiToken: env.SEPAY_USER_API_TOKEN ? String(env.SEPAY_USER_API_TOKEN).trim() : '',
      allowedIps,
      apiBaseUrl: (env.SEPAY_API_BASE_URL ? String(env.SEPAY_API_BASE_URL).trim() : 'https://my.sepay.vn/userapi').replace(
        /\/+$/,
        '',
      ),
    },
    payment: {
      reservationMinutes: parsePositiveInt(env.PAYMENT_RESERVATION_MINUTES, 15, 'PAYMENT_RESERVATION_MINUTES'),
      partialGraceMinutes: parsePositiveInt(env.PAYMENT_PARTIAL_GRACE_MINUTES, 30, 'PAYMENT_PARTIAL_GRACE_MINUTES'),
      reconcileIntervalMs: parsePositiveInt(env.RECONCILE_INTERVAL_MS, 300000, 'RECONCILE_INTERVAL_MS'),
      expireIntervalMs: parsePositiveInt(env.EXPIRE_INTERVAL_MS, 60000, 'EXPIRE_INTERVAL_MS'),
    },
  };
}

export const config = loadConfig(process.env);
