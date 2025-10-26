const { Sequelize } = require('sequelize');

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  NODE_ENV,
  DB_SSL = 'true',
  DB_POOL_MAX,
  DB_POOL_MIN,
  DB_POOL_IDLE,
  DB_POOL_ACQUIRE,
} = process.env;

let sequelize;

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

if (shouldUseSsl) {
  baseOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
}

if (DATABASE_URL) {
  sequelize = new Sequelize(DATABASE_URL, baseOptions);
} else {
  sequelize = new Sequelize(PGDATABASE, PGUSER, PGPASSWORD, {
    host: PGHOST,
    port: PGPORT ? Number(PGPORT) : 5432,
    ...baseOptions,
  });
}

module.exports = { sequelize };
