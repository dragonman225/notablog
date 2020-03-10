import path from 'path'
import { spawn } from 'child_process'
import { getConfig, outDir } from './util'

/**
 * Open `index` with `bin`.
 * @see https://nodejs.org/api/child_process.html#child_process_options_detached
 * @param {string} bin 
 * @param {string} index 
 */
function open(bin, index) {
  const p = spawn(bin, [index], { detached: true, stdio: 'ignore' })
  p.unref()
}

/**
 * Preview the generate blog.
 * @param {string} workDir 
 */
export function preview(workDir) {
  const c = getConfig(workDir)
  if (c.previewBrowser) {
    open(c.previewBrowser, path.join(outDir(workDir), 'index.html'))
  } else {
    throw new Error('"previewBrowser" property is not set in your Notablog config file.')
  }
}