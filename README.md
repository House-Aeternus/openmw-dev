# OpenMW Dev
Unofficial development documentation for OpenMW Lua mod making.

## Running Locally
You must have NodeJS installed in your CLI. You must also have Angular globally installed (for simple use of `ng`).
```bash
npm install -g @angular/cli
```


Change directories into `src/website` and run:
```bash
npm start
```

## Writing documentation

Documentation source files live in `src/website/content/`. Every `.md` file in that directory becomes a document when the site builds. `index.md` is served at `/docs`; a flat file such as `getting-started.md` is served at `/docs/getting-started`.

The supported authoring features are GitHub-flavored Markdown, YAML front matter, fenced code blocks (including `lua`), alert directives, and tabbed code examples. The content compiler runs automatically before `npm start` and `npm run build`, or on its own with `npm run content` after you edit Markdown while the dev server is already running.

```md
---
title: A clear page title
description: A one-sentence summary for navigation and search.
---

:::warning[Short warning title]
Alert body written in ordinary Markdown.
:::

:::tabs

@tab Local script
```lua
local ui = require('openmw.ui')
```

@tab Global script
```lua
local core = require('openmw.core')
```

:::
```

Alert kinds are `note`, `tip`, `warning`, and `danger`. A tabs directive must contain at least two `@tab Label` markers, each immediately followed by one fenced code block; invalid structures fail the content build with the file name and reason.

Standalone fenced code blocks support `title="..."` metadata for their header label:

````md
```lua title="hud.lua"
local hud = {}
```
````
