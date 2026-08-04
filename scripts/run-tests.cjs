const os = require("node:os");
const { syncBuiltinESMExports } = require("node:module");

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({
    username: "codex",
    homedir: process.cwd(),
    shell: null,
    uid: -1,
    gid: -1,
  });
  syncBuiltinESMExports();
}

import("tsx")
  .then(() => import("../src/engine/__tests__/run-all.ts"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
