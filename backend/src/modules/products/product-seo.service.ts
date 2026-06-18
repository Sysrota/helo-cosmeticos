import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let timer: NodeJS.Timeout | undefined;
let running = false;
let pending = false;

function findProjectRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
  ];

  const root =
    candidates.find((candidate) =>
      fs.existsSync(
        path.join(candidate, "tools", "generate-product-seo-pages.mjs")
      )
    );

  if (!root) {
    throw new Error(
      "Script de SEO de produtos não encontrado em tools/generate-product-seo-pages.mjs"
    );
  }

  return root;
}

function runProductSeoGeneration() {
  if (running) {
    pending = true;
    return;
  }

  running = true;
  pending = false;

  const projectRoot = findProjectRoot();
  const scriptPath =
    path.join(projectRoot, "tools", "generate-product-seo-pages.mjs");

  execFile(
    process.execPath,
    [scriptPath],
    {
      cwd: projectRoot,
      env: process.env,
    },
    (error, stdout, stderr) => {
      running = false;

      if (stdout.trim()) {
        console.log(stdout.trim());
      }

      if (error) {
        console.error(
          "Erro ao gerar SEO de produtos:",
          stderr.trim() || error.message
        );
      } else if (stderr.trim()) {
        console.warn(stderr.trim());
      }

      if (pending) {
        scheduleProductSeoGeneration("execução pendente");
      }
    }
  );
}

export function scheduleProductSeoGeneration(reason: string) {
  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    timer = undefined;

    try {
      runProductSeoGeneration();
    } catch (error) {
      console.error(
        `Erro ao agendar SEO de produtos (${reason}):`,
        error
      );
    }
  }, 800);
}
