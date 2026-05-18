import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname, join } from "node:path";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
const targetExtensions = new Set([".css", ".ts", ".tsx"]);
const mojibakePattern =
  /[\uFFFD]|濡|蹂|諛|鍮|뚯|꾩|곷|덉|쒓|쀫|숇|媛|踰|嫄|怨|湲|由|醫|쨌|짤/;

const findFiles = (directory) => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...findFiles(path));
      continue;
    }

    if (targetExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
};

const brokenFiles = findFiles(sourceRoot).filter((filePath) =>
  mojibakePattern.test(readFileSync(filePath, "utf8")),
);

if (brokenFiles.length > 0) {
  console.error("Possible Korean encoding issues found:");
  for (const filePath of brokenFiles) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

console.log("No Korean encoding issues found.");
