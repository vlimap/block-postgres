const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { User } = require('../models');

const {
  NODE_ENV,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL,
} = process.env;

if ((!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_CALLBACK_URL) && NODE_ENV !== 'test') {
  throw new Error(
    'GitHub OAuth não configurado. Defina GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET e GITHUB_CALLBACK_URL nas variáveis de ambiente.',
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID || 'placeholder',
      clientSecret: GITHUB_CLIENT_SECRET || 'placeholder',
      callbackURL: GITHUB_CALLBACK_URL,
      scope: ['user:email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = Array.isArray(profile.emails) && profile.emails.length > 0
          ? profile.emails[0].value
          : null;

        const [user] = await User.findOrCreate({
          where: { githubId: profile.id },
          defaults: {
            name: profile.displayName || profile.username || 'Usuário',
            email,
            avatarUrl: profile.photos?.[0]?.value || null,
          },
        });

        if (
          user.email !== email ||
          user.name !== (profile.displayName || profile.username) ||
          user.avatarUrl !== (profile.photos?.[0]?.value || null)
        ) {
          await user.update({
            email,
            name: profile.displayName || profile.username || user.name,
            avatarUrl: profile.photos?.[0]?.value || user.avatarUrl,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

module.exports = passport;
