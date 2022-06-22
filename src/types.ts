import { createAgent } from 'notionapi-agent'
import { SemanticString } from 'nast-types'

import { Cache } from './cache'
import { Renderer } from './renderer'

export interface Tag {
  value: string
  color: string
}

export interface SiteContext {
  iconUrl: string | undefined
  cover: string | undefined
  title: string
  description: SemanticString[] | undefined
  descriptionPlain: string
  descriptionHTML: string
  pages: PageMetadata[]
  /** tag name -> pages */
  tagMap: Map<string, PageMetadata[]>
}

export interface PageMetadata {
  /** No dashes. */
  id: string
  iconUrl: string | undefined
  cover: string | undefined
  title: string
  tags: Tag[]
  publish: boolean
  inMenu: boolean
  inList: boolean
  template: string
  url: string
  description: SemanticString[] | undefined
  descriptionPlain: string
  descriptionHTML: string
  date: string | undefined
  dateString: string | undefined
  createdTime: number
  lastEditedTime: number
}

export interface RenderTask {
  data: Record<string, unknown>
  tools: {
    renderer: Renderer
    notionAgent: ReturnType<typeof createAgent>
    cache: Cache
  }
  config: {
    workDir: string
    themeDir: string
    outDir: string
    tagDir: string
  }
}

export interface RenderIndexTask extends RenderTask {
  data: {
    siteContext: SiteContext
  }
}

export interface RenderPostTask extends RenderTask {
  data: {
    siteContext: SiteContext
    pageMetadata: PageMetadata
    doFetchPage: boolean
  }
}

export interface NotablogStarterConfig {
  url: string
  theme: string
  previewBrowser: string
  autoSlug: boolean
  locales: string | string[] | undefined
}

export interface ThemeConfig {
  notablogVersion: string
  templateEngine: string
}
