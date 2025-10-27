const { Sequelize } = require('sequelize');
const dns = require('dns');

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  NODE_ENV = 'development',
  DB_SSL = 'true',
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_POOL_IDLE,
  DB_POOL_ACQUIRE,
  TEST_DB_STORAGE,
} = process.env;

const isTest = NODE_ENV === 'test';

let sequelize;

if (isTest) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: TEST_DB_STORAGE || ':memory:',
    logging: false,
  });
} else {
  const shouldUseSsl = (() => {
    if (DATABASE_URL && DATABASE_URL.includes('sslmode=require')) return true;
    return DB_SSL === 'true' || DB_SSL === '1';
  })();

  const baseOptions = {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: DB_POOL_MAX ? Number(DB_POOL_MAX) : 5,
      min: DB_POOL_MIN ? Number(DB_POOL_MIN) : 0,
      idle: DB_POOL_IDLE ? Number(DB_POOL_IDLE) : 10000,
      acquire: DB_POOL_ACQUIRE ? Number(DB_POOL_ACQUIRE) : 30000,
    },
  };

  const ipv4Lookup = (hostname, options, callback) =>
    dns.lookup(hostname, { ...options, family: 4, all: false }, callback);

  baseOptions.dialectOptions = {
    ...(shouldUseSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {}),
    lookup: ipv4Lookup,
  };

  const resolveIPv4Host = (hostname) => {
    try {
      const { address } = dns.lookupSync(hostname, { family: 4 });
      return address || null;
    } catch (error) {
      return null;
    }
  };

  if (DATABASE_URL) {
    let connectionUri = DATABASE_URL;
    try {
      const parsed = new URL(DATABASE_URL);
      const ipv4Host = resolveIPv4Host(parsed.hostname);
      if (ipv4Host) {
        parsed.hostname = ipv4Host;
        parsed.host = ipv4Host + (parsed.port ? `:${parsed.port}` : '');
        connectionUri = parsed.toString();
      }
    } catch (error) {
      // ignore malformed URLs; fallback to original connection string
    }
    sequelize = new Sequelize(connectionUri, baseOptions);
  } else {
    sequelize = new Sequelize(PGDATABASE, PGUSER, PGPASSWORD, {
      host: PGHOST,
      port: PGPORT ? Number(PGPORT) : 5432,
      ...baseOptions,
    });
  }
}

module.exports = { sequelize };
