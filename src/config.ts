import fs from 'fs'
import { promises as fsPromises } from 'fs'

import { log } from './utils'

export class Config {
  private configPath: string
  private configObj: {
    url: string
    theme: string
    previewBrowser: string
  }

  constructor(configPath: string) {
    this.configPath = configPath
    try {
      this.configObj = JSON.parse(
        fs.readFileSync(configPath, { encoding: 'utf-8' })
      )
    } catch (error) {
      log.error(`Failed to load config from "${configPath}".`)
      throw error
    }
  }

  get(key: string) {
    return this.configObj[key]
  }

  set(key: string, data: any) {
    this.configObj[key] = data
  }

  /** Sync changes to file. */
  sync() {
    return fsPromises.writeFile(this.configPath, JSON.stringify(this.configObj))
  }
}
