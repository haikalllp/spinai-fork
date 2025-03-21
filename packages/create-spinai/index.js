#!/usr/bin/env node

import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const createSpinaiAppPath = require.resolve("create-spinai-app/dist/index.js");

const child = spawn("node", [createSpinaiAppPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code);
});
