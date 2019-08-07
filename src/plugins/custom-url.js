const plugin = {
  name: 'customUrl',
  func: customUrl,
  options: {
    // Here may define default options if a user doesn't override.
  }
}

module.exports = plugin

function customUrl() {
  /**
   * A plugin gets `this.pageType` and `this.context` when called.
   * `this.pageType` is useful to determine what the format of the context
   * is.
   * `this.context` can be manipulated.
   * `this.options` are options that can be set by a user.
   */
  let pageType = this.pageType
  let context = this.context
  let idUrlMap = context.siteMetadata.idUrlMap

  if (pageType === 'index') {
    context.index.posts.forEach(post => {
      let url = idUrlMap[post.id]
      if (url != null) post.customUrl = `${url}.html`
      else post.customUrl = `${post.id}.html`
    })
  } else if (pageType === 'post') {
    let url = idUrlMap[context.post.id]
    if (url != null) context.post.customUrl = `${url}.html`
    else context.post.customUrl = `${context.post.id}.html`
  }

}