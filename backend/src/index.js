const { createApp, sequelize } = require('./app');

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    const { app } = await createApp();
    await sequelize.authenticate();
    console.log('[db] conexão estabelecida com sucesso');
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

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
