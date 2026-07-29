import { copyFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const PACKAGE_NAME = "replicad-opencascadejs";
const PACKAGE_MANIFEST = `${PACKAGE_NAME}/package.json`;
const OPEN_CASCADE_RUNTIME_FILENAMES = [
  "replicad_with_exceptions.js",
  "replicad_with_exceptions.wasm",
];
const SOURCE_DIRECTORY = "src";
const PUBLIC_DIRECTORY = "public";
const PUBLIC_WASM_DIRECTORY = "wasm";
const MINIMUM_VALID_FILE_SIZE_BYTES = 1;

const packageRoot = dirname(require.resolve(PACKAGE_MANIFEST));
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDirectory, "..");
const destinationDirectory = join(
  projectRoot,
  PUBLIC_DIRECTORY,
  PUBLIC_WASM_DIRECTORY,
);

await mkdir(destinationDirectory, { recursive: true });

for (const filename of OPEN_CASCADE_RUNTIME_FILENAMES) {
  const sourcePath = join(packageRoot, SOURCE_DIRECTORY, filename);
  const destinationPath = join(destinationDirectory, filename);
  await copyFile(sourcePath, destinationPath);

  const copiedFile = await stat(destinationPath);
  if (copiedFile.size < MINIMUM_VALID_FILE_SIZE_BYTES) {
    throw new Error(`STEP runtime preparation produced an empty ${filename}.`);
  }

  console.log(`Prepared STEP runtime: ${sourcePath} -> ${destinationPath}`);
}
