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

  get<T extends keyof NotablogStarterConfig>(key: T): NotablogStarterConfig[T] {
    return this.configObj[key]
  }

  set<T extends keyof NotablogStarterConfig>(
    key: T,
    data: NotablogStarterConfig[T]
  ): void {
    this.configObj[key] = data
  }

  /** Sync changes to file. */
  sync(): Promise<void> {
    return fsPromises.writeFile(this.configPath, JSON.stringify(this.configObj))
  }
}
