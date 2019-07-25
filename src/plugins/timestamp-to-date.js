module.exports = {
  transformDate
}

function transformDate() {
  this.posts.forEach(post => {
    let d = new Date(post.date)
    let date = d.getDate().toString().padStart(2, '0')
    let month = (d.getMonth() + 1).toString().padStart(2, '0')
    let year = d.getFullYear()
    post.date = `${year}.${month}.${date}`
  })
}
