const fs = require('fs')
const path = require('path')
const NotionAgent = require('notionapi-agent')
const downloadPageAsTree = require('notionast-util-from-notionapi')
const { toHTML } = require('notionast-util-to-html')
const Sqrl = require('squirrelly')

const { log } = require('./utils')

module.exports = {
  renderPost
}

async function renderPost(post) {
  if (post != null) {
    const pageID = post.pageID

    /** Download page. */
    log(`Fetch page ${pageID}.`)
    let nast = await downloadPageAsTree(pageID, new NotionAgent({ suppressWarning: true }))
    let contentHTML = toHTML(nast, { contentOnly: true })

    /** Render with template. */
    log(`Render page ${pageID}.`)
    const workDir = process.cwd()
    const outDir = path.join(workDir, 'public')
    const postTemplatePath = path.join(workDir, 'layout/post.html')
    const postTemplate = fs.readFileSync(postTemplatePath, { encoding: 'utf-8' })
    const postPath = path.join(outDir, `${pageID}.html`)
    Sqrl.autoEscaping(false)
    const html = Sqrl.Render(postTemplate, {
      ...post,
      content: contentHTML
    })
    fs.writeFileSync(postPath, html, { encoding: 'utf-8' })
  }
}