process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || process.env.FRONTEND_URL;
process.env.DB_SSL = 'false';
