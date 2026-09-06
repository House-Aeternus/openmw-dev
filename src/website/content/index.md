---
title: OpenMW Lua documentation
description: Community-maintained guides and references for OpenMW Lua mods.
---

## OpenMW Lua documentation

This site is built from Markdown files in `content/`. The source format supports GitHub-flavored Markdown, alert directives, syntax-highlighted code, and accessible tabbed examples.

:::warning[Local and global scripts differ]
Lua APIs are scoped by the script type. Always check the API reference before moving code between local and global scripts.
:::

## Tabbed examples

:::tabs

@tab Local script
```lua
local ui = require('openmw.ui')

ui.showMessage('Hello from a local script')
```

@tab Global script
```lua
local core = require('openmw.core')

print('OpenMW version: ' .. core.version)
```

:::
