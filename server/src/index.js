import "dotenv/config";
import { connectDatabase } from "./config/db.js";
import { validateEnvironment } from "./config/env.js";
import app from "./app.js";

const port = Number(process.env.PORT || 4000);

try {
  validateEnvironment();
  await connectDatabase();
  app.listen(port, () => console.info(`SkillBarter API listening on port ${port}`));
} catch (error) {
  console.error("API startup failed:", error.message);
  process.exitCode = 1;
}
