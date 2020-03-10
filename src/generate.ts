import fs from 'fs'
import path from 'path'
import { createAgent } from 'notionapi-agent'
import { TaskManager2 } from '@dnpr/task-manager'
import { copyDirSync } from '@dnpr/fsutil'
import { TemplateProvider } from './template-provider'
import { parseTable } from './parse-table'
import { renderIndex } from './render-index'
import { renderPost } from './render-post'
import { log, getConfig } from './util'

type GenerateOptions = {
  concurrency?: number
  verbose?: boolean
}

/**
 * Check if a page is newer than its cached version.
 * @param {string} uri 
 * @param {number} lastEditedTime 
 * @param {string} cacheDir 
 */
function isPageUpdated(pageId, lastEditedTime, cacheDir) {
  const cacheFileName = pageId + '.json'
  const cacheFilePath = path.join(cacheDir, cacheFileName)
  if (fs.existsSync(cacheFilePath)) {
    const lastCacheTime = fs.statSync(cacheFilePath).mtimeMs
    return lastEditedTime > lastCacheTime
  } else {
    return true
  }
}

/**
 * @typedef {Object} GenerateOptions
 * @property {string} workDir - A valid Notablog starter directory.
 * @property {number} concurrency - Concurrency for Notion page 
 * downloading and rendering.
 * @property {boolean} verbose - Whether to print more messages for 
 * debugging.
 */

/**
 * Generate a blog.
 */
export async function generate(workDir: string, opts: GenerateOptions = {}) {
  const concurrency = opts.concurrency
  const verbose = opts.verbose
  const notion = createAgent({ debug: verbose })
  const config = getConfig(workDir)

  /** Init dir paths. */
  const cacheDir = path.join(workDir, 'source/notion_cache')
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }

  const themeDir = path.join(workDir, `themes/${config.theme}`)
  if (!fs.existsSync(themeDir)) {
    throw new Error(`Cannot find "${config.theme}" in themes/ folder`)
  }

  const outDir = path.join(workDir, 'public')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const tagDir = path.join(workDir, 'public/tag')
  if (!fs.existsSync(tagDir)) {
    fs.mkdirSync(tagDir, { recursive: true })
  }

  const dirs = {
    workDir, cacheDir, themeDir, outDir, tagDir
  }

  /** Create TemplateProvider instance. */
  const templateProvider = new TemplateProvider(themeDir)

  /** Copy theme assets. */
  log.info('Copy theme assets')
  const assetDir = path.join(themeDir, 'assets')
  copyDirSync(assetDir, outDir)

  /** Fetch site metadata. */
  log.info('Fetch Site Metadata')
  const siteMeta = await parseTable(config.url, notion)

  /** Render site entry. */
  log.info('Render site entry')
  renderIndex({
    data: {
      siteMeta
    },
    tools: {
      templateProvider
    },
    config: {
      ...dirs
    }
  })

  /** Render pages. */
  log.info('Fetch and render pages')
  const { pagesUpdated, pagesNotUpdated } = siteMeta.pages
    .reduce((data, page) => {
      if (isPageUpdated(page.id, page.lastEditedTime, cacheDir)) {
        data.pagesUpdated.push(page)
      } else {
        data.pagesNotUpdated.push(page)
      }
      return data
    }, {
      pagesUpdated: [], pagesNotUpdated: []
    } as {
      pagesUpdated: typeof siteMeta.pages,
      pagesNotUpdated: typeof siteMeta.pages
    })

  const pageTotalCount = siteMeta.pages.length
  const pageUpdatedCount = pagesUpdated.length
  const pagePublishedCount = siteMeta.pages
    .filter(page => page.publish).length
  log.info(`${pageUpdatedCount} of ${pageTotalCount} posts have been updated`)
  log.info(`${pagePublishedCount} of ${pageTotalCount} posts are published`)

  const tm2 = new TaskManager2({ concurrency })
  const tasks = []
  pagesUpdated.forEach(page => {
    tasks.push(tm2.queue(renderPost, [{
      data: {
        siteMeta, page
      },
      tools: {
        templateProvider, notion
      },
      config: {
        ...dirs,
        doFetchPage: true
      }
    }]) as never)
  })
  pagesNotUpdated.forEach(page => {
    tasks.push(tm2.queue(renderPost, [{
      data: {
        siteMeta, page
      },
      tools: {
        templateProvider, notion
      },
      config: {
        ...dirs,
        doFetchPage: false
      }
    }]) as never)
  })
  await Promise.all(tasks)
  return 0
}