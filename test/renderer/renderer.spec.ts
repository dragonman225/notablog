import { test } from 'zora'
import { EJSStrategy, SqrlStrategy, Renderer } from '../../src/renderer'

test('Renderer', t => {
  t.test('EJS strategy', t => {
    const ejsRenderer = new Renderer(new EJSStrategy(__dirname))
    const html = ejsRenderer.render('test-ejs', { title: 'Hello' })
    t.equal(html, '<h1>Hello</h1>', 'should render EJS template')
  })

  t.test('Squirrelly strategy', t => {
    const sqrlRenderer = new Renderer(new SqrlStrategy(__dirname))
    const html = sqrlRenderer.render('test-sqrl', { title: 'Hello' })
    t.equal(html, '<h1>Hello</h1>\n', 'should render Squirrelly template')
  })
})
