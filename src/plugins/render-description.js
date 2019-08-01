const { toHTMLInternal } = require('nast-util-to-html')

const plugin = {
  name: 'renderDescription',
  func: renderDescription,
  options: {
    // Here may define default options if a user doesn't override.
  }
}

module.exports = plugin

function renderDescription() {
  /**
   * A plugin gets `this.pageType` and `this.context` when called.
   * `this.pageType` is useful to determine what the format of the context
   * is.
   * `this.context` can be manipulated.
   * `this.options` are options that can be set by a user.
   */
  let pageType = this.pageType
  let context = this.context

  if (pageType === 'index') {
    context.index.posts.forEach(post => {
      post.descriptionHTML = renderToHTML(post.description)
      post.descriptionPlainText = renderToPlainText(post.description)
    })
  } else if (pageType === 'post') {
    context.post.descriptionHTML = renderToHTML(context.post.description)
    context.post.descriptionPlainText = renderToPlainText(context.post.description)
  }

}

function renderToHTML(desc) {
  return toHTMLInternal.renderTitle(desc)
}

function renderToPlainText(desc) {
  return desc.map(str => str[0]).join('')
}