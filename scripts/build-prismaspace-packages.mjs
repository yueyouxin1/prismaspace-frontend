import { execFileSync } from 'node:child_process'

execFileSync('pnpm', ['typecheck:packages'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
