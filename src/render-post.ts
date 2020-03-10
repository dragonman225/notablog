import fs from 'fs'
import fsPromises = fs.promises
import path from 'path'
import { getOnePageAsTree } from 'nast-util-from-notionapi'
import { renderToHTML } from 'nast-util-to-react'
import Sqrl from 'squirrelly'

import { log, parseJSON } from './util'
import { toDashID } from './notion-utils'

/**
 * Render a post.
 * @param {RenderPostTask} task
 */
export async function renderPost(task) {

  const siteMeta = task.data.siteMeta
  const templateProvider = task.tools.templateProvider
  const notion = task.tools.notion
  const page = task.data.page
  const config = task.config

  const pageID = toDashID(page.id)
  const cacheFileName = page.id + '.json'
  const cacheFilePath = path.join(config.cacheDir, cacheFileName)

  let nast, contentHTML

  /** Fetch page. */
  if (config.doFetchPage) {
    log.info(`Fetch data of page "${pageID}"`)
    nast = await getOnePageAsTree(pageID, notion)
    fs.writeFile(cacheFilePath, JSON.stringify(nast), (err) => {
      if (err) console.error(err)
      else log.info(`Cache of "${pageID}" is saved`)
    })
  } else {
    log.info(`Read cache of page "${pageID}"`)
    let cache = await fsPromises.readFile(cacheFilePath, { encoding: 'utf-8' })
    let _nast = parseJSON(cache)
    if (_nast != null) nast = _nast
    else throw new Error(`\
Cache of page "${pageID}" is corrupted, delete source/notion_cache to rebuild`)
  }

  /** Render with template. */
  if (page.publish) {
    log.info(`Render page "${pageID}"`)
    contentHTML = renderToHTML(nast)
    const outDir = config.outDir
    const postPath = path.join(outDir, page.url)

    Sqrl.autoEscaping(false)
    const html = Sqrl.Render(templateProvider.get(page.template), {
      siteMeta,
      post: {
        ...page,
        contentHTML
      }
    })
    await fsPromises.writeFile(postPath, html, { encoding: 'utf-8' })
    return 0
  } else {
    log.info(`Skip rendering of unpublished page "${pageID}"`)
    return 1
  }

}