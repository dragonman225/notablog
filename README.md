# notablog

![version](https://img.shields.io/npm/v/notablog.svg?style=flat-square&color=007acc&label=version) ![license](https://img.shields.io/github/license/dragonman225/notablog.svg?style=flat-square&label=license&color=08CE5D)

Generate a minimalistic blog from a Notion.so table.

Here are some images of [my blog](https://dragonman225.js.org/), using [`notablog-starter`'s default theme](https://github.com/dragonman225/notablog-starter/tree/master/themes/pure). 🙂

|            Mobile             |            Desktop             |
| :---------------------------: | :----------------------------: |
| ![](assets/v0.3.0_mobile.png) | ![](assets/v0.3.0_desktop.png) |

| Management Interface on Notion.so |
| :-------------------------------: |
|   ![](assets/v0.3.0_manage.png)   |

### :construction: This is under construction, there may be breaking changes often ! :construction:



## Table of Contents

* [Announcement](#Announcement)
* [Getting Started](#Getting-Started)
* [Blog Management Interface](#Blog-Management-Interface)
* [API Reference](#API-Reference)
* [Notes](#Notes)



## Announcement

### [2019.09.02]

BREAKING CHANGES of `v0.3.0` : If you want to upgrade from `v0.2.1` or lower, please delete old `notablog-starter` and go through [Getting Started](#Getting-Started) again since `notablog-starter` has a lot of changes.



## Getting Started

> Make sure you have Node.js v12.0.0 or higher. Check with command `node -v`.

1. Clone the [`notablog-starter`](https://github.com/dragonman225/notablog-starter) repository and install dependencies.
   ```bash
   git clone https://github.com/dragonman225/notablog-starter.git
   cd notablog-starter && npm install
   ```

2. While it's installing, go to this [Notion table template](https://www.notion.so/b6fcf809ca5047b89f423948dce013a0?v=03ddc4d6130a47f8b68e74c9d0061de2) and duplicate it.

3. Make the table you've duplicated **public** and **copy its URL** (for the next step).

4. Go back to `notablog-starter`, open `config.json`. Replace the value of `url` with the URL of the table you've duplicated (the one you copied in previous step).

5. If `npm install` finishes, issue command `npm run generate`.

6. Go to `public` folder, open `index.html` in a browser to preview your blog.

* Now, your blog is ready. You can edit something on Notion, then `npm run generate` again to update the generated blog.

* Next, you can upload the `public` folder to any **static hosting** service or your **own server** to share your blog globally.

* [Github Pages](https://pages.github.com/), [Netlify](https://www.netlify.com/), [surge.sh](https://surge.sh) are some choices for static hosting service. [nginx](https://www.nginx.com/), [lighttpd](https://www.lighttpd.net/), [Apache httpd](https://httpd.apache.org/) are some choices for self-hosted server.



## Blog Management Interface

This is the documentation of [Notion table template](https://www.notion.so/b6fcf809ca5047b89f423948dce013a0?v=03ddc4d6130a47f8b68e74c9d0061de2)

|  Column Name  | Property Type  |                         Description                          |
| :-----------: | :------------: | :----------------------------------------------------------: |
|    `title`    |    `Title`     |                       The page title.                        |
|    `tags`     | `Multi-Select` |                 Topics related to the page.                  |
|   `publish`   |   `Checkbox`   |           Determine if a page should be rendered.            |
|   `inMenu`    |   `Checkbox`   |    Determine if a page should appear in the topbar menu.     |
|   `inList`    |   `Checkbox`   |   Determine if a page should appear in the list of posts.    |
|  `template`   |    `Select`    | Specify which template to use for the page. Available template names depend on which theme you use. |
|     `url`     |     `Text`     | A string to be used as the filename and the URL of the generated page. It should not contain `/` and `\`. If it's empty, the `id` of the page is used. |
| `description` |     `Text`     |         Short intro of the page. Styles are working.         |
|    `date`     |     `Date`     | User customizable date, convenient for importing posts from other platforms or adjusting the order of posts. |

* **Trick** : Check `publish` but leave `inMenu` and `inList` unchecked to create a *hidden* page which people can access only if knowing its URL.




## API Reference

### Introduction

`notablog` itself is designed to be installed as a dependency, and invoked from NPM script. This way we can separate application code and user assets so that it's less confusing for a user. To make things even more simple, I have prepared [`notablog-starter`](https://github.com/dragonman225/notablog-starter), so a user doesn't have to setup folder structure manually. The concept is inspired by a popular project [hexo](https://github.com/hexojs/hexo).

With the design, a user only sees `notablog-starter` when using, therefore the following documentation will be in the context of `notablog-starter`.

### Simplified Folder Structure

```
notablog-starter
├── config.json
├── public
├── source
│   └── notion_cache
└── themes
    └── pure
```

- `config.json` - Site config.

  | Field |  Type  |                         Description                          |
  | :---: | :----: | :----------------------------------------------------------: |
  |  url  | string |     The URL of a Notion table compatible with Notablog.      |
  | theme | string | The theme to use. It should be one of the folder names in `themes/`. |

- `public/` - Contains generated static assets of the blog.

- `source/notion_cache/` - Cached JSON files of Notion pages. They are used when a user runs `npm run generate`, if a page contains no changes, the generator reads data from these cached files.

- `themes/` - Store themes.

### Theme

A theme contains layout templates, CSS files, fonts, and other assets that shapes the style and look of a blog.

#### Folder Structure

```
<name>
├── layout
└── assets
```

* `<name>` - Theme folder name, also the name to be used in `notablog-starter/config.json`.
* `layout/` - Contains page templates. It is required to have at least one index layout (`index.html`) and one post layout (`post.html`). You can have more templates, and a user can use those bonus templates by specifying the template's filename in `template` field on Notion.
* `assets/` - Other assets. Anything in this folder will be copied to `notablog-starter/public/` when running `npm run generate`.

#### Template Language

* Currently, I use [Squirrelly.js](https://squirrelly.js.org/) as template engine.

* Template `index.html` gets the following structure of data :

  ```
  {
		siteMeta {
			icon // Emoji or URL
			iconHTML // Rendered HTML
			cover // URL
			title // String
			description // Raw array, do not use
			descriptionPlain // Rendered plain text, no style
			descriptionHTML // Rendered HTML, with style
			pages { // An array of page
				id // Notion's page id
				icon // Emoji or URL
				iconHTML // Rendered HTML
				cover // URL
				title // String
				tags // An array, [{ color: string, value: string }]
				publish // Boolean, `true` if publish is checked.
				inMenu // Boolean, `true` if inMenu is checked.
				inList // Boolean, `true` if inList is checked.
				template // Template name
				url // URL of the page relative to site root
				description // Raw array, do not use
				descriptionPlain // Rendered plain text, no style
				descriptionHTML // Rendered HTML, with style
				date // Raw string, e.g. 2019-08-09
				dateString // Formatted, e.g. Fri, Aug 9, 2019
				createdTime // Unix timestamp
				lastEditedTime // Unix timestamp
			}
		}
  }
  ```

* Template `post.html` or others gets the following structure of data :

  ```
  {
		siteMeta // The same as "siteMeta" in index.html
		post {
			...post // All properties of a page in "siteMeta.pages"
			contentHTML // HTML of post body
		}
  }
  ```

> It is highly recommended to take a look at [notablog-theme-pure](https://github.com/dragonman225/notablog-theme-pure) if you want to make your own !



## Notes

### Code Structure

Generated by `dependency-cruiser` NPM package.

![](assets/deps_graph.svg)

### EJS

There is an experimental version at `ejs` branch that uses [EJS](https://ejs.co/) as template engine. Main advantage of EJS is its `include` feature, which enable us to make repetitive parts of template into components that can be reused. I also made an EJS version of `notablog-theme-pure` [here](https://github.com/dragonman225/notablog-theme-pure-ejs).