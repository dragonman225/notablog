import fs from 'fs'
import path from 'path'
import { Logger } from '@dnpr/logger'

/**
 * Wrapper of console.log().
 */
export const log = new Logger('notablog', {
  logLevel: typeof process.env.DEBUG_EN !== 'undefined' ? 'debug' : 'info',
  useColor: typeof process.env.NO_COLOR !== 'undefined' ? false : true
})

/**
 * Failsafe JSON.parse() wrapper.
 * @param {*} str - Payload to parse.
 * @returns {Object} Parsed object when success, undefined when fail.
 */
export function parseJSON(str) {
  try {
    return JSON.parse(str)
  } catch (error) {
    return void 0
  }
}

/**
 * @typedef {Object} NotablogConfig
 * @property {string} url - URL of a Notion table.
 * @property {string} theme - Name of a theme.
 * @property {string} previewBrowser - Path to a browser executable.
 */

/**
 * Read and parse the JSON config file.
 * @param {string} workDir - A valid Notablog starter directory.
 * @returns {NotablogConfig}
 */
export function getConfig(workDir) {
  const cPath = path.join(workDir, 'config.json')
  const cFile = fs.readFileSync(cPath, { encoding: 'utf-8' })
  try {
    const config = JSON.parse(cFile)
    return config
  } catch (error) {
    console.error(error)
    throw new Error(`Fail to parse config at ${cPath}`)
  }
}

/**
 * Get the path of output dir and ensure it is available.
 * @param {string} workDir
 * @returns {string} 
 */
export function outDir(workDir) {
  const outDir = path.join(workDir, 'public')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  return outDir
}

export function numToOrder(n: number) {
  switch (n) {
    case 1:
      return "1st"
    case 2:
      return "2nd"
    default:
      return `${n}th`
  }
}