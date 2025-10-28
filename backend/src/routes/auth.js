const express = require('express');
const passport = require('../config/passport');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL;

router.get('/github', (req, res, next) => {
  // Bloqueia fluxo se variáveis de OAuth não estiverem preenchidas.
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Login com GitHub não configurado.' });
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${FRONTEND_URL}?auth=failed`,
  }),
  (_req, res) => {
    // Redireciona de volta ao frontend aplicando status via query string.
    res.redirect(`${FRONTEND_URL}?auth=success`);
  },
);

router.post('/logout', (req, res) => {
  req.logout?.(function logoutCallback(err) {
    if (err) {
      return res.status(500).json({ error: 'Falha ao encerrar sessão' });
    }
    req.session?.destroy?.(() => {
      res.clearCookie('connect.sid');
      res.status(204).end();
    });
  });
});

module.exports = router;
