import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const targetFile = path.join(root, 'apps/studio-web/src/router/routes')

const files = [
  'home.routes.ts',
  'auth.routes.ts',
  'billing.routes.ts',
  'console.routes.ts',
  'account.routes.ts',
  'settings.routes.ts',
]

const requiredPaths = [
  '/',
  '/pricing',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/billing/checkout',
  '/billing/result',
  '/console',
  '/projects',
  '/account/profile',
  '/account/security',
  '/settings/team',
  '/settings/workspace',
]

const text = files
  .map((file) => fs.readFileSync(path.join(targetFile, file), 'utf-8'))
  .join('\n')

const missing = requiredPaths.filter((item) => !text.includes(`path: '${item}'`))

if (missing.length) {
  console.error('SaaS route smoke test failed. Missing paths:')
  missing.forEach((item) => console.error(`- ${item}`))
  process.exit(1)
}

console.log(`SaaS route smoke test passed (${requiredPaths.length} paths).`)
