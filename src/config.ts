import fs from 'fs'
import { promises as fsPromises } from 'fs'

import { log } from './utils/misc'
import { NotablogStarterConfig } from './types'

export class Config {
  private configPath: string
  private configObj: NotablogStarterConfig

  constructor(configPath: string) {
    this.configPath = configPath
    try {
      this.configObj = JSON.parse(
        fs.readFileSync(configPath, { encoding: 'utf-8' })
      ) as NotablogStarterConfig
    } catch (error) {
      log.error(`Failed to load config from "${configPath}".`)
      throw error
    }
  }

  get(
    key: keyof NotablogStarterConfig
  ): NotablogStarterConfig[keyof NotablogStarterConfig] {
    return this.configObj[key]
  }

  set(
    key: keyof NotablogStarterConfig,
    data: NotablogStarterConfig[keyof NotablogStarterConfig]
  ): void {
    this.configObj[key] = data
  }

  /** Sync changes to file. */
  sync(): Promise<void> {
    return fsPromises.writeFile(this.configPath, JSON.stringify(this.configObj))
  }
}
