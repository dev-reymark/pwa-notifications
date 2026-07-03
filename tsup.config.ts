import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    client: "src/client/index.ts",
    server: "src/server/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["web-push"],
});
