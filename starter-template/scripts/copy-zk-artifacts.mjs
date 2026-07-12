// Copies the DataRegistry contract's compiled ZK artifacts (keys/, zkir/) from the
// installed SDK package into public/, so Vite serves them alongside the app.
// MidnightChainAdapter's connector mode fetches them over HTTP via zkConfigBaseUrl
// instead of reading them from disk (that's what provider mode does via zkArtifactsPath).
import { cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const managedDir = path.join(
  rootDir,
  "node_modules/@dstorage-tech/chain/src/adapters/midnight/contracts/dataregistry/managed",
);

for (const dir of ["keys", "zkir"]) {
  const src = path.join(managedDir, dir);
  const dest = path.join(rootDir, "public", dir);
  await cp(src, dest, { recursive: true });
  console.log(`Copied ${src} -> ${dest}`);
}
