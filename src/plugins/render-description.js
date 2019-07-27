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
      post.description = toHTMLInternal.renderTitle(post.description)
    })
  } else if (pageType === 'post') {
    context.post.description = toHTMLInternal.renderTitle(context.post.description)
  }

}