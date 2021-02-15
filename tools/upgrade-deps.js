/**
 * Upgrade dependencies to the latest with pnpm.
 */

const { spawn } = require('child_process')

const manifest = require('../package.json')

const devDeps = Object.keys(manifest.devDependencies
  ? manifest.devDependencies : [])
const deps = Object.keys(manifest.dependencies
  ? manifest.dependencies : [])

const devDepsLatest = devDeps.map(d => `${d}@latest`)
const depsLatest = deps.map(d => `${d}@latest`)

const bin = 'yarn'
let args = ['upgrade']
args = args.concat(devDepsLatest)
args = args.concat(depsLatest)

// TODO: Spawn detached process
const upgrade = spawn(bin, args)

upgrade.stdout.on('data', (data) => {
  console.log(data.toString())
})

upgrade.stderr.on('data', (data) => {
  console.error(`stderr: ${data.toString()}`)
})

upgrade.on('close', (code) => {
  console.log(`child process exited with code ${code}`)
})