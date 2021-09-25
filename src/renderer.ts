import { render as renderWithEjs } from 'ejs'
import { render as renderWithSqrl } from 'squirrelly'

import { TemplateProvider } from './templateProvider'

export interface RenderStrategy {
  render: (templateName: string, data: Record<string, unknown>) => string
}

export class EJSStrategy implements RenderStrategy {
  private templateProvider: TemplateProvider

  constructor(templateDir: string) {
    this.templateProvider = new TemplateProvider(templateDir)
  }

  render(templateName: string, data: Record<string, unknown>): string {
    const template = this.templateProvider.get(templateName)
    return renderWithEjs(template.content, data, {
      filename: template.filePath,
    })
  }
}

export class SqrlStrategy implements RenderStrategy {
  private templateProvider: TemplateProvider

  constructor(templateDir: string) {
    this.templateProvider = new TemplateProvider(templateDir)
  }

  render(templateName: string, data: Record<string, unknown>): string {
    const template = this.templateProvider.get(templateName)
    return renderWithSqrl(template.content, data, {
      filename: template.filePath,
    }) as string
  }
}

export class Renderer {
  private strategy: RenderStrategy

  constructor(strategy: RenderStrategy) {
    this.strategy = strategy
  }

  render(templateName: string, data: Record<string, unknown>): string {
    return this.strategy.render(templateName, data)
  }
}
