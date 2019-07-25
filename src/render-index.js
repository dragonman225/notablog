const fs = require('fs')
const path = require('path')
const { toHTMLInternal } = require('notionast-util-to-html')
const Sqrl = require('squirrelly')

module.exports = {
  renderIndex
}

function renderIndex(config, posts) {
  const workDir = process.cwd()
  const outDir = path.join(workDir, 'public')
  const indexTemplatePath = path.join(workDir, 'layout/index.html')
  const indexTemplate = fs.readFileSync(indexTemplatePath, { encoding: 'utf-8' })
  const indexPath = path.join(outDir, 'index.html')
  Sqrl.autoEscaping(false)
  const index = Sqrl.Render(indexTemplate, {
    siteTitle: config.title,
    posts: posts.map(post => {
      const { description, ...rest } = post
      return {
        description: toHTMLInternal.renderTitle(description),
        ...rest
      }
    })
  })
  fs.writeFileSync(indexPath, index, { encoding: 'utf-8' })
}