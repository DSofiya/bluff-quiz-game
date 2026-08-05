import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3000";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Command ${command} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Command ${command} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

await run(process.execPath, ["./node_modules/prisma/build/index.js", "migrate", "deploy"]);

const child = spawn(process.execPath, ["./node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
