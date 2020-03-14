import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { log } from './util'

export class Cache {
  private cacheDir: string

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
  }

  get(namespace: string, id: string): object | undefined {
    const fPath = this.fPath(namespace, id)
    /** Read file. */
    if (!fs.existsSync(fPath)) {
      log.debug(`Failed to get cache "${id}" of namespace "${namespace}".`)
      return undefined
    }
    const data = fs.readFileSync(fPath, { encoding: 'utf-8' })
    /** Parse file. */
    try {
      const obj = JSON.parse(data)
      return obj
    } catch (error) {
      log.debug(`Cache object "${id}" of namespace "${namespace}" is corrupted.`)
      log.debug(error)
      return undefined
    }
  }

  set(namespace: string, id: string, obj: object) {
    const fPath = this.fPath(namespace, id)
    fs.writeFileSync(fPath, JSON.stringify(obj, getCircularReplacer()))
  }

  shouldUpdate(namespace: string, id: string, lastModifiedTime: number) {
    const fPath = this.fPath(namespace, id)
    if (fs.existsSync(fPath)) {
      const lastModifiedTimeOfCache = fs.statSync(fPath).mtimeMs
      return lastModifiedTime > lastModifiedTimeOfCache
    } else {
      return true
    }
  }

  fPath(namespace: string, id: string) {
    return path.join(this.cacheDir, this._hash(namespace + id))
  }

  private _hash(payload: string) {
    return crypto.createHash('sha256').update(payload).digest('hex')
  }
}

/**
 * Filter circular object for JSON.stringify()
 * @function getCircularReplacer
 * @returns {object} Filtered object.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
 */
function getCircularReplacer() {
  const seen = new WeakSet()
  return (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return
      }
      seen.add(value)
    }
    return value
  }
}