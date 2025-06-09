# leafer-x-clip-resize-inner-editor

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

leafer 图片裁剪 内部编辑器插件

## 安装
```bash
npm i leafer-x-clip-resize-inner-editor
```

## 特点

1. 添加了自定义元素 `ClipImage`（裁剪的必要元素）
2. 实现：移动、缩放、旋转裁剪，支持图片拉伸
3. 基于 innerEditor 开发规范开发，所以内部编辑器会继承相关的样式，支持双击开启/关闭内部编辑
4. 详细使用方式移步 [[playground](playground/src/main.ts)]

## 快速使用
```ts
import { App } from 'leafer-ui'
import { ClipImage, ClipResizeEditor } from 'leafer-x-clip-resize-inner-editor'
import '@leafer-in/editor'
import '@leafer-in/viewport'
import '@leafer-in/view'

// 为元素注册内部编辑器
ClipImage.setEditInner(ClipResizeEditor.name)

const app = new App({
  view: window,
  editor: {},
})

// 最简创建, 默认无剪裁
const ui = new ClipImage({
  url: '/static/test2.jpg',
  editable: true,
})

app.tree.add(ui)
```

## License

[MIT](./LICENSE) License © 2024-PRESENT [XiaDeYu](https://github.com/Xdy1579883916)

[MIT](https://github.com/leaferjs/leafer-ui/blob/main/LICENSE) License © 2023-PRESENT [Chao (Leafer) Wan](https://github.com/leaferjs)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/leafer-x-clip-resize-inner-editor?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/leafer-x-clip-resize-inner-editor
[npm-downloads-src]: https://img.shields.io/npm/dm/leafer-x-clip-resize-inner-editor?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/leafer-x-clip-resize-inner-editor
[bundle-src]: https://img.shields.io/bundlephobia/minzip/leafer-x-clip-resize-inner-editor?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=leafer-x-clip-resize-inner-editor
[license-src]: https://img.shields.io/github/license/Xdy1579883916/leafer-x-clip-resize-inner-editor.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/Xdy1579883916/leafer-x-clip-resize-inner-editor/blob/main/LICENSE
