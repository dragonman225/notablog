import fs from 'fs'
import path from 'path'
import { Logger } from '@dnpr/logger'

/**
 * Wrapper of console.log().
 */
export const log = new Logger('notablog', {
  logLevel: typeof process.env.DEBUG !== 'undefined' ? 'debug' : 'info',
  useColor: typeof process.env.NO_COLOR !== 'undefined' ? false : true
})

/**
 * Log a message to indicate a feature is being deprecated.
 * @param msg - The message.
 */
export function DEPRECATE(msg: string) {
  log.warn(msg)
}

/**
 * Failsafe JSON.parse() wrapper.
 * @param str - Payload to parse.
 * @returns Parsed object when success, undefined when fail.
 */
export function parseJSON(str): object | undefined {
  try {
    return JSON.parse(str)
  } catch (error) {
    return void 0
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
      return '1st'
    case 2:
      return '2nd'
    case 3:
      return '3rd'
    default:
      return `${n}th`
  }
}

/**
 * Make doing multi-layer object or array access like `obj.a.b.c.d` or 
 * `arr[0][1][0][1]` more easily.
 * 
 * Example Usage:
 * 
 * In the constructor of {@link NDateTimeCell}, we want to access  
 * a `NAST.DateTime` stored in a `NAST.SemanticString[]`.
 * 
 * With vanilla JS, we would write:
 * 
 * ```
 * something[0][1][0][1]
 * ```
 * 
 * which is prone to get the error:
 * 
 * ```
 * TypeError: Cannot read property '0' of undefined
 * ```
 * 
 * We could use `try...catch...` to wrap it:
 * 
 * ```
 * try {
 *   result = something[0][1][0][1]
 * } catch(error) {
 *   result = undefined
 * }
 * ```
 * 
 * But with this helper function, we could simply write:
 * 
 * ```
 * result = objAccess(something)(0)(1)(0)(1)()
 * ```
 * 
 * However, note that the cost is that an `undefined` occurred in the 
 * middle of the function call chain would be passed to the end 
 * instead of stop execution.
 * 
 * @param objLike - An object (or an array).
 */
export function objAccess(objLike) {
  return function (key) {
    /** Call with no parameter to signal the end of the access chain. */
    if (typeof key === 'undefined') {
      return objLike
    }
    /**
     * Try to access the array if it is truthy.
     * Otherwise, just pass the falsy value.
     */
    if (objLike) {
      return objAccess(objLike[key])
    } else {
      return objAccess(objLike)
    }
  }
}