import { build } from "https://deno.land/x/dnt@0.11.0/mod.ts";

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
    undici: true,
  },
  skipSourceOutput: true,
  package: {
    name: "@fdionisi/device-authorization-grant",
    version: Deno.args[0],
    description:
      "A library to help implement the OAuth 2.0 Device Authorization Grant.",
    author: "Federico Dionisi",
    keywords: [
      "cli",
      "oauth",
      "device code flow",
    ],
    license: "MIT",
    homepage: "https://github.com/fdionisi/device-authorization-grant#readme",
    repository: {
      type: "git",
      url: "git+https://github.com/fdionisi/device-authorization-grant.git",
    },
    bugs: {
      url: "https://github.com/fdionisi/device-authorization-grant/issues",
    },
  },
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
