#!/usr/bin/env node
/**
 * Deploy WLM Az with the @clack/prompts UI (intro / confirm / spinner / outro).
 *
 * This is the deployment workflow formerly in deploy.sh; the shell script is
 * now only a thin launcher so the interactive experience comes from Clack
 * (quadrant spinner @ ~80ms, confirm prompts, ✔/✖ step lines) instead of
 * an imitation.
 *
 * Usage:
 *   bash deploy.sh               interactive (requires a TTY)
 *   bash deploy.sh -y | --yes    unattended: no prompts, steps still animate
 *
 * Fail-safe rule: with no TTY and no -y, refuse with a message instead of
 * hanging on a confirm nobody can answer (Clack would otherwise leave an
 * unsettled promise). Long-running steps capture their output and only print
 * it on failure; stdin stays attached so git credential prompts still work.
 */
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");

const AUTO_CONFIRM =
   process.argv.slice(2).includes("-y") || process.argv.slice(2).includes("--yes");

// @clack/prompts is a devDependency (deploy-time tooling only). Lazy-load it
// so a fresh clone without node_modules gets a clear error, not a stack
// (the deploy.sh launcher normally installs it first).
let prompts;
try {
   prompts = await import("@clack/prompts");
} catch {
   console.error("Missing dependency @clack/prompts — run `npm install` first, then deploy again.");
   process.exit(1);
}
const { intro, confirm, spinner, log, outro, isCancel } = prompts;

if (!process.stdin.isTTY && !AUTO_CONFIRM) {
   console.error("Not an interactive terminal — re-run with -y for an unattended deploy.");
   process.exit(1);
}

if (AUTO_CONFIRM) {
   console.log("🤖 Running in auto-confirm mode");
}

/** Currently running child, so a spinner Ctrl-C can stop it. */
let activeChild = null;

/** Synchronous `git` read, like bash's $(git ...) with `set -e` tolerance. */
function git(args) {
   try {
      return execFileSync("git", args, {
         encoding: "utf8",
         stdio: ["pipe", "pipe", "pipe"],
      }).trim();
   } catch {
      return "";
   }
}

/**
 * One deploy step behind a spinner. The step's stdout/stderr arrives live as
 * the spinner's message (its last line, so quiet commands still show what
 * they're doing), and the full captured output is printed once the step
 * succeeds. Failure renders `✖ label`, dumps the captured output, and
 * aborts the deploy.
 */
async function step(label, cmd, args = []) {
   const s = spinner({
      onCancel: () => {
         // Ctrl-C while a step runs: stop the child, then bow out.
         activeChild?.kill("SIGTERM");
         process.exit(130);
      },
   });
   s.start(label);

   const output = await new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ["inherit", "pipe", "pipe"], cwd: ROOT });
      activeChild = child;

      let buf = "";
      let pending = "";
      const onData = (d) => {
         buf += d;
         pending += d;
         const lines = pending.split(/[\r\n]+/);
         const tail = lines[lines.length - 1];
         pending = tail;
         if (tail) s.message(`${label} — ${tail}`);
      };
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);

      child.on("error", reject);
      child.on("close", (code) =>
         code === 0
            ? resolve(buf)
            : reject(
                 Object.assign(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`), {
                    output: buf,
                 }),
              ),
      );
   }).then(
      (out) => {
         s.stop(label);
         // Show the command's actual output once it finishes (the old shell
         // script streamed it live; unattended -y runs stay quiet).
         if (out.trim() && process.stdin.isTTY) log.message(out.trimEnd());
         return out;
      },
      (err) => {
         s.error(`${label} — failed`);
         if (err?.output) console.log(err.output);
         else console.error(err?.message ?? err);
         process.exit(1);
      },
   );

   activeChild = null;
   return output;
}

/** Ask a yes/no question (auto-yes under -y). Cancel aborts the deploy. */
async function ask(message) {
   if (AUTO_CONFIRM) {
      log.info(`${message} (auto)`);
      return true;
   }
   const v = await confirm({ message });
   if (isCancel(v)) {
      log.warn("Deployment cancelled");
      process.exit(1);
   }
   return v;
}

// ---------------------------------------------------------------------------

intro("WLM Az deployment");
log.info(`Started ${new Date().toLocaleString()}`);

// Pre-deployment checks
const branch = git(["branch", "--show-current"]);
if (branch !== "main") {
   log.warn(`You are on branch '${branch || "unknown"}', not 'main'`);
   if (!(await ask("Continue anyway?"))) {
      log.warn("Deployment cancelled");
      process.exit(1);
   }
}

const dirty = git(["status", "--porcelain"]);
if (dirty) {
   log.warn("You have uncommitted changes:");
   console.log(dirty);
   if (!(await ask("Continue with uncommitted changes?"))) {
      log.warn("Deployment cancelled");
      process.exit(1);
   }
}

if (await ask("Pull latest changes from git?")) {
   await step("Pull latest changes", "git", ["pull"]);
} else {
   log.info("Skipping git pull");
}

if (await ask("Install/update npm packages?")) {
   await step("Install npm packages", "npm", ["install"]);
} else {
   log.info("Skipping npm install");
}

if (await ask("Build application?")) {
   await step("Build application", "npm", ["run", "build"]);
} else {
   log.info("Skipping build");
}

// nginx.conf includes the prerender-generated monument-redirects.conf;
// `nginx -t` fails when the file is absent (fresh clone without a build).
const redirectsPath = path.join(ROOT, "monument-redirects.conf");
if (!fs.existsSync(redirectsPath)) {
   log.warn("monument-redirects.conf missing — run npm run build to generate it");
   if (!(await ask("Create an empty placeholder (no redirects) and continue?"))) {
      log.warn("Deployment cancelled");
      process.exit(1);
   }
   fs.writeFileSync(
      redirectsPath,
      "# placeholder: run npm run build to generate monument redirects\n",
   );
}

if (await ask("Update Nginx config?")) {
   await step("Update Nginx config", "bash", [
      "-c",
      "sudo cp nginx.conf /etc/nginx/sites-available/wlmaz && sudo nginx -t && sudo systemctl reload nginx",
   ]);
} else {
   log.info("Skipping Nginx config update");
}

if (await ask("Restart application with PM2?")) {
   await step("Restart application (PM2)", "pm2", ["reload", "wlmaz"]);
   // Stream the logs like the old shell script (ends when you press Ctrl-C).
   await new Promise((resolve) => {
      const logs = spawn("pm2", ["logs", "wlmaz"], { stdio: "inherit", cwd: ROOT });
      logs.on("error", () => resolve());
      logs.on("close", () => resolve());
   });
} else {
   log.info("Skipping PM2 restart");
}

outro("Deployment complete!");
