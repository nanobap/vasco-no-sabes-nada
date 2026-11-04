// Publica el export estático (out/) en la rama gh-pages del remoto origin.
// Uso: node scripts/deploy.mjs   (requiere haber corrido `next build` antes)
import { execSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync, mkdtempSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

if (!existsSync("out/index.html")) throw new Error("No existe out/index.html: corré `npm run build` primero");

const remote = execSync("git remote get-url origin").toString().trim();
const sha = execSync("git rev-parse --short HEAD").toString().trim();
const work = mkdtempSync(join(tmpdir(), "vasco-pages-"));

cpSync("out", work, { recursive: true });
writeFileSync(join(work, ".nojekyll"), "");

const run = (cmd) => execSync(cmd, { cwd: work, stdio: "inherit" });
run("git init -q -b gh-pages");
run("git add -A");
run(`git -c user.name="vasco-deploy" -c user.email="deploy@vasco.local" commit -q -m "deploy ${sha}"`);
run(`git push -f "${remote}" gh-pages:gh-pages`);
rmSync(work, { recursive: true, force: true });
console.log(`publicado ${sha} en gh-pages`);
