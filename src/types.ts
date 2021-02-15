import { createAgent } from 'notionapi-agent'
import { SemanticString } from 'nast-types'
import { TemplateProvider } from './template-provider'
import { Cache } from './cache'

export interface Tag {
  value: string
  color: string
}

export interface PageMetadata {
  id: string
  icon: string | undefined
  iconHTML: string
  cover: string | undefined
  title: SemanticString[]
  tags: Tag[]
  publish: boolean
  inMenu: boolean
  inList: boolean
  template: string
  url: string
  description: string | undefined
  descriptionPlain: string
  descriptionHTML: string
  date: string | undefined
  dateString: string | undefined
  createdTime: number
  lastEditedTime: number
}

export interface SiteContext {
  icon: string | undefined
  iconHTML: string
  cover: string | undefined
  title: SemanticString[]
  description: SemanticString[] | undefined
  descriptionPlain: string
  descriptionHTML: string
  pages: PageMetadata[]
  /** tag name -> pages */
  tagMap: Map<string, PageMetadata[]>
}

export interface RenderPostTask {
  data: {
    siteContext: SiteContext
    pageMetadata: PageMetadata
  }
  tools: {
    templateProvider: TemplateProvider
    notionAgent: ReturnType<typeof createAgent>
    cache: Cache
  }
  config: {
    doFetchPage: boolean
    workDir: string
    themeDir: string
    outDir: string
    tagDir: string
  }
}