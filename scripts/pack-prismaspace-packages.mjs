import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, '.packs')
mkdirSync(outDir, { recursive: true })

const packageRoots = [
  path.join(root, 'packages', 'prismaspace'),
  path.join(root, 'packages', 'prismaspace', 'resources'),
]

const seen = new Set()
for (const packageRoot of packageRoots) {
  for (const entry of readdirSync(packageRoot)) {
    const fullPath = path.join(packageRoot, entry)
    if (!statSync(fullPath).isDirectory()) {
      continue
    }
    const pkgFile = path.join(fullPath, 'package.json')
    if (!existsSync(pkgFile) || seen.has(fullPath)) {
      continue
    }
    seen.add(fullPath)
    execFileSync('pnpm', ['pack', '--pack-destination', outDir], {
      cwd: fullPath,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
  }
}
