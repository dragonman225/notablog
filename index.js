const fs = require('fs')
const NotionAgent = require('notionapi-agent')
const TaskManager = require('@dnpr/task-manager')

const { parseTable } = require('./src/parse-table')
const { renderIndex } = require('./src/render-index')
const { renderPost } = require('./src/render-post')
const { log } = require('./src/utils')
const { transformDate } = require('./src/plugins/timestamp-to-date')

const config = JSON.parse(fs.readFileSync('config.json', { encoding: 'utf-8' }))
const url = config.url
const apiAgent = new NotionAgent({ suppressWarning: true })

const taskManagerOpts = {
  delay: 0,
  delayJitterMax: 0,
  parallelNum: 3,
  debug: false
}

/**
 * Simple Plugin System:
 * 
 * What is a plugin?
 * 
 * A plugin is a function that get called at certain build stage.
 * The function is called with `thisArg` set to `BlogTable`.
 * That means a user can access things like `this.global`, `this.posts`
 * and manipulate them.
 * 
 * Which build stage to inject?
 * 
 * `beforeRender` - After getting the `BlogTable` from Notion, before all
 * page rendering start.
 * 
 */
const plugins = {
  beforeRender: [
    transformDate
  ]
}

main()

async function main() {
  try {

    let startTime = Date.now()

    /** Fetch BlogTable. */
    log('Fetch BlogTable.')
    let site = await parseTable(url, apiAgent)

    /** Run `beforeRender` plugins. */
    log('Run beforeRender plugins.')
    plugins.beforeRender.forEach(plugin => {
      if (typeof plugin === 'function')
        plugin.call(site)
      else
        log('Plugin is not a function, ignored.')
    })

    /** Render index. */
    log('Render index.')
    renderIndex(site.global, site.posts)

    /** Fetch & render posts. */
    log('Fetch and render posts.')
    const tm = new TaskManager(site.posts, renderPost, taskManagerOpts)
    tm.start()
    await tm.finish()

    let endTime = Date.now()
    let timeElapsed = (endTime - startTime) / 1000
    log(`Build complete in ${timeElapsed}s`)

  } catch (error) {
    console.error(error)
  }
}