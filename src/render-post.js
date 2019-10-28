const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const { NotionAgent } = require('notionapi-agent')
const { getOnePageAsTree } = require('nast-util-from-notionapi')
const { renderToHTML } = require('nast-util-to-html')
const Sqrl = require('squirrelly')

const { log, parseJSON } = require('./utils')

module.exports = {
  renderPost
}

/**
 * @typedef {Object} PostOperation
 * @property {boolean} doFetchPage
 * @property {boolean} enablePlugin
 */

/**
 * @typedef {Object} NotablogPlugin
 * @property {string} name
 * @property {Function} func
 * @property {Object} options
 */

/**
 * @typedef {Object} RenderPostTask
 * @property {SiteMetadata} siteMeta
 * @property {Object} post - ...PageMetadata + cachePath
 * @property {PostOperation} operations
 * @property {NotablogPlugin[]} plugins
 */

/**
 * Render a post.
 * @param {RenderPostTask} task
 * // TODO: May be attach a CacheProvider instance in task to handle cache 
 * lookup and update operations. Index doesn't go through this pipeline.
 */
async function renderPost(task) {
  if (task != null) {
    const siteMeta = task.siteMeta
    const templateProvider = task.templateProvider
    const post = task.post
    const operations = task.operations
    const plugins = task.plugins

    const pageID = post.id
    const cachePath = post.cachePath

    let nast, contentHTML

    /** Fetch page. */
    if (operations.doFetchPage) {
      log.info(`Fetch page ${pageID}`)
      nast = await getOnePageAsTree(pageID, new NotionAgent({ suppressWarning: true, verbose: false }))
      fs.writeFile(cachePath, JSON.stringify(nast), (err) => {
        if (err) console.error(err)
        else log.info(`Cache of ${pageID} is saved`)
      })
    } else {
      log.info(`Read page cache ${pageID}`)
      let cache = await fsPromises.readFile(cachePath, { encoding: 'utf-8' })
      let _nast = parseJSON(cache)
      if (_nast != null) nast = _nast
      else throw new Error(`Cache of ${pageID} is corrupted, delete source/notion_cache to rebuild`)
    }

    /** Run `beforeRender` plugins. */
    log.info(`Run beforeRender plugins on ${pageID}`)
    if (operations.enablePlugin) {
      plugins.forEach(plugin => {
        if (typeof plugin.func === 'function')
          plugin.func.call({
            pageType: 'post',
            context: {
              siteMeta, post
            },
            options: plugin.options
          })
        else
          log.warn(`Plugin ${plugin.name} is in wrong format, skipped`)
      })
    }

    /** Render with template. */
    if (post.publish) {
      log.info(`Render page ${pageID}`)
      contentHTML = renderToHTML(nast, { contentOnly: true })
      const workDir = process.cwd()
      const outDir = path.join(workDir, 'public')
      const postPath = path.join(outDir, post.url)

      Sqrl.autoEscaping(false)
      const html = Sqrl.Render(templateProvider.get(post.template), {
        siteMeta,
        post: {
          ...post,
          contentHTML
        }
      })
      await fsPromises.writeFile(postPath, html, { encoding: 'utf-8' })
    } else {
      log.info(`Skip rendering of unpublished page ${pageID}`)
    }
  }
}