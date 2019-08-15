const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const NotionAgent = require('notionapi-agent')
const { getOnePageAsTree } = require('../../notajs/packages/nast-util-from-notionapi')
const { renderToHTML } = require('../../notajs/packages/nast-util-to-html')
const Sqrl = require('squirrelly')

const { log, parseJSON } = require('./utils')

module.exports = {
  renderPost
}

/**
 * @typedef {Object} NotablogMetadata
 * @property {string} icon
 * @property {string} title
 */

/**
 * @typedef {Object} Post
 * @property {string} id
 * @property {string} title
 * @property {Tag[]} tags
 * @property {string} icon
 * @property {string} cover
 * @property {StyledString[]} description
 * @property {number} createdTime
 * @property {number} lastEditedTime
 * @property {string} url
 * @property {boolean} inList
 * @property {boolean} inMenu
 * @property {boolean} publish
 * @property {string} cachePath
 * @property {string} template
 * @property {string} descriptionHTML - Plugin: `render-description`
 * @property {string} descriptionPlainText - Plugin: `render-description`
 * @property {string} createdTime - Plugin: `timestamp-to-date`
 * @property {string} iconHTML - Plugin: `render-icon`
 */

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
 * @property {NotablogMetadata} siteMeta
 * @property {Post} post
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
      log(`Fetch page ${pageID}.`)
      nast = await getOnePageAsTree(pageID, new NotionAgent({ suppressWarning: true }))
      fs.writeFile(cachePath, JSON.stringify(nast), (err) => {
        if (err) console.error(err)
        else log(`Cache of ${pageID} is saved.`)
      })
    } else {
      log(`Read page cache ${pageID}.`)
      let cache = await fsPromises.readFile(cachePath, { encoding: 'utf-8' })
      let _nast = parseJSON(cache)
      if (_nast != null) nast = _nast
      else throw new Error(`Cache of ${pageID} is corrupted. Delete source/notion_cache to rebuild.`)
    }

    /** Run `beforeRender` plugins. */
    log(`Run beforeRender plugins on ${pageID}.`)
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
          log(`Plugin ${plugin.name} is in wrong format, skipped.`)
      })
    }

    /** Render with template. */
    log(`Render page ${pageID}.`)
    contentHTML = renderToHTML(nast, { contentOnly: true })
    const workDir = process.cwd()
    const outDir = path.join(workDir, 'public')
    const postPath = path.join(outDir, post.url)

    Sqrl.autoEscaping(false)
    const html = Sqrl.Render(templateProvider.get(post.template), {
      siteMeta,
      post,
      content: contentHTML
    })
    await fsPromises.writeFile(postPath, html, { encoding: 'utf-8' })
  }
}