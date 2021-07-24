import ejs from 'ejs'
const sqrl = require('squirrelly') // cannot use import

import { TemplateProvider } from './template-provider'
import { DEPRECATE } from './utils'

export interface RenderStrategy {
  render: (templateName: string, data: any) => string
}

export class EJSStrategy implements RenderStrategy {
  private templateProvider: TemplateProvider

  constructor(templateDir: string) {
    this.templateProvider = new TemplateProvider(templateDir)
  }

  render(templateName, data) {
    const template = this.templateProvider.get(templateName)
    return ejs.render(template.content, data, {
      filename: template.filePath
    })
  }
}

export class SqrlStrategy implements RenderStrategy {
  private templateProvider: TemplateProvider

  constructor(templateDir: string) {
    DEPRECATE('Squirrelly templates will be deprecated, please migrate \
to EJS templates (https://ejs.co/).')
    this.templateProvider = new TemplateProvider(templateDir)
    sqrl.autoEscaping(false)
  }

  render(templateName, data) {
    const template = this.templateProvider.get(templateName)
    return sqrl.Render(template.content, data)
  }
}

export class Renderer {
  private strategy: RenderStrategy

  constructor(strategy: RenderStrategy) {
    this.strategy = strategy
  }

  render(templateName: string, data: object) {
    return this.strategy.render(templateName, data)
  }
}