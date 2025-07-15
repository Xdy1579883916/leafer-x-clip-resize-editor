import type { IEditPointInputData } from 'leafer-ui'
import { ClipImage, ClipResizeEditor, ClipResizeEditorEvent } from '@cr/lib'
import { App, Debug } from 'leafer-ui'
import '@leafer-in/editor'
import '@leafer-in/viewport'
import '@leafer-in/view'

ClipImage.setEditInner(ClipResizeEditor.name)

Debug.showBounds = false
// Debug.showRepaint = true
const basePoint: IEditPointInputData = {
  cornerRadius: 5,
  fill: '#fff',
  stroke: {
    type: 'solid',
    color: '#AAABAC',
  },
  strokeWidth: 0.5,
}
const app = new App({
  view: document.getElementById('app'),
  editor: {
    editSize: 'size',
    lockRatio: 'corner',
    hideOnMove: true,
    stroke: '#4D7CFF',
    point: {
      width: 10,
      height: 10,
      editConfig: { editSize: 'font-size' },
      ...basePoint,
    },
    middlePoint: {
      width: 16,
      height: 8,
      ...basePoint,
    },
    rotateGap: 45,
    skewable: false,
    circle: {
      width: 22,
      height: 22,
      strokeWidth: 0,
      fill: [
        {
          type: 'image',
          url: '/static/circle.svg',
        },
      ],
    },
    moveCursor: {
      url: '/static/move.svg',
      x: 15,
      y: 15,
    },
  },
  move: {
    disabled: false,
    dragAnimate: false,
  },
  wheel: {
    zoomMode: false,
    zoomSpeed: 0.01,
    moveSpeed: 0.1,
  },
  zoom: {
    max: 4,
    min: 0.02,
  },
})

const innerWidth = app.tree.width
const innerHeight = app.tree.height

const size = {
  width: 242.67610999773487,
  height: 319.7226848187476,
}
const ui = new ClipImage({
  url: '/static/test.jpg',
  clip: {
    x: -112.06774519440373,
    y: -168.10161779156934,
    width: 469.69569677021724,
    height: 618.0206536450227,
    rotation: 53,
  },
  ...size,
  x: (innerWidth - size.width) / 2,
  y: (innerHeight - size.height) / 2,
  editable: true,
})

// 最简创建, 默认无剪裁
const ui2 = new ClipImage({
  url: '/static/test2.jpg',
  editable: true,
})

app.tree.add(ui)
app.tree.add(ui2)

app.editor.on([
  ClipResizeEditorEvent.UPDATE_EDITOR_BOUNDS,
  ClipResizeEditorEvent.BEFORE_START,
  ClipResizeEditorEvent.START,
  ClipResizeEditorEvent.END,
], (e: ClipResizeEditorEvent) => {
  console.log(e.type, e)
})
;(window as any).app = app
