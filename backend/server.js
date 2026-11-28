import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";

const { port } = getEnv();
const app = createApp();

const server = app.listen(port, () => {
  console.log(`DailyPilot backend listening on http://localhost:${port}`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
