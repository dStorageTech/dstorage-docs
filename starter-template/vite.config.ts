import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";

// The Midnight SDK was built for Node.js and uses WebAssembly (ZK circuit
// execution) plus Node built-ins under the hood — none of that works with
// Vite's defaults, hence the plugins below. See the dApp Connector guide's
// Vite reference for the full explanation of each one.
export default defineConfig({
  resolve: {
    alias: {
      // The compiled SDK bundle imports these shim paths directly (baked in
      // by its own build, expecting vite-plugin-node-polyfills to provide
      // them). @dstorage-tech/* deps are `file:` links into ../dstorage-sdk,
      // a separate node_modules tree that doesn't have this plugin
      // installed — force resolution to this project's own copy via an
      // absolute path.
      "vite-plugin-node-polyfills/shims/buffer": fileURLToPath(
        new URL(
          "./node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.js",
          import.meta.url,
        ),
      ),
      "vite-plugin-node-polyfills/shims/global": fileURLToPath(
        new URL(
          "./node_modules/vite-plugin-node-polyfills/shims/global/dist/index.js",
          import.meta.url,
        ),
      ),
    },
  },
  plugins: [
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      include: ["buffer", "process", "util", "crypto", "stream"],
      globals: { Buffer: true, process: true },
    }),
    viteCommonjs(),
  ],
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["@midnight-ntwrk/*"],
  },
});
