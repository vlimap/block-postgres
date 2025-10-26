require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const { sequelize } = require('./config/database');
require('./models');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const requireAuth = require('./middleware/requireAuth');
const { marketingConsentSchema } = require('./utils/validation');
const defaultCspDirectives =
  helmet.contentSecurityPolicy && typeof helmet.contentSecurityPolicy.getDefaultDirectives === 'function'
    ? helmet.contentSecurityPolicy.getDefaultDirectives()
    : {};

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || FRONTEND_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET não definido. Configure a variável de ambiente.');
}
if (!FRONTEND_URL) {
  throw new Error('FRONTEND_URL não definido. Configure a URL autorizada do frontend.');
}

const store = new SequelizeStore({
  db: sequelize,
  expiration: 7 * 24 * 60 * 60 * 1000,
});

const app = express();
app.set('trust proxy', 1);

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  helmet({
    contentSecurityPolicy:
      NODE_ENV === 'production'
        ? {
            useDefaults: true,
            directives: {
              ...defaultCspDirectives,
              'img-src': ["'self'", 'data:', 'https://avatars.githubusercontent.com'],
              'connect-src': ["'self'", ...CORS_ORIGINS],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CORS_ORIGINS.includes(origin)) {
        return callback(null, origin || CORS_ORIGINS[0]);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store,
  }),
);

store.sync();

app.use(passport.initialize());
app.use(passport.session());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api/me', (req, res) => {
  if (!req.user) {
    return res.status(200).json({ user: null });
  }
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
      githubId: req.user.githubId,
      marketingOptIn: req.user.marketingOptIn,
      marketingConsentAt: req.user.marketingConsentAt,
    },
  });
});

app.post('/api/me/marketing-consent', requireAuth, async (req, res, next) => {
  const parse = marketingConsentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }
  try {
    const updated = await req.user.update({
      marketingOptIn: parse.data.marketingOptIn,
      marketingConsentAt: new Date(),
    });
    res.json({
      marketingOptIn: updated.marketingOptIn,
      marketingConsentAt: updated.marketingConsentAt,
    });
  } catch (error) {
    next(error);
  }
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('[db] conectado em', sequelize.getDatabaseName(), 'host:', sequelize.config.host);
    await sequelize.sync({ alter: true });
    app.listen(PORT, () => {
      console.log(`API rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar servidor', error);
    process.exit(1);
  }
};

start();

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor' });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
