const app = require('./app');
const { connect, seedAdmin } = require('./config/db');
const { runSeed } = require('./services/seed');

async function start() {
  await connect();
  await runSeed();
  await seedAdmin();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`DailyPilot API running: http://localhost:${PORT}`));
}

if (require.main === module) {
  start().catch(e => {
    console.error('Startup failed:', e.message);
    process.exit(1);
  });
}

module.exports = { app, start };
