const plugin = {
  name: 'transformDate',
  func: transformDate,
  options: {
    // Here may define default options if a user doesn't override.
  }
}

module.exports = plugin

function transformDate() {
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
      post.createdTimeHumanReadable = doTransformDate(post.createdTime)
    })
  } else if (pageType === 'post') {
    context.post.createdTimeHumanReadable = doTransformDate(context.post.createdTime)
  }

}

function doTransformDate(timestamp) {
  let d = new Date(timestamp)
  let date = d.getDate().toString().padStart(2, '0')
  let month = (d.getMonth() + 1).toString().padStart(2, '0')
  let year = d.getFullYear()
  return `${year}.${month}.${date}`
}