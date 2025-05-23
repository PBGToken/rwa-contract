import { build } from "esbuild"
import { dirname, join } from "node:path"

async function main() {
    const repoRoot = dirname(process.argv[1])

    const srcBaseDir = join(repoRoot, "src")
    const dstBaseDir = join(repoRoot, "dist")

    await build({
        bundle: true,
        splitting: false,
        format: "esm",
        platform: "node",
        packages: "external",
        minify: false,
        outfile: join(dstBaseDir, "index.js"),
        entryPoints: [join(srcBaseDir, "index.ts")],
        plugins: [],
        define: {},
        tsconfig: join(repoRoot, "./tsconfig.json")
    })
}

main()
