import type { IEditorMoveEvent, IEditorRotateEvent, IEditorScaleEvent, IEditPoint } from '@leafer-in/interface'
import type { RotateEvent } from '@leafer-ui/core'
import type { IAlign, IImage, IPointData } from '@leafer-ui/interface'
import type { ClipImage } from '../ui/ClipImage'
import { EditDataHelper, InnerEditor, registerInnerEditor } from '@leafer-in/editor'
import {
  AroundHelper,
  Box,
  DragEvent,
  LeafHelper,
  MathHelper,
  MoveEvent,
  PointerEvent,
  PointHelper,
} from '@leafer-ui/core'
import { EditBox } from './display/EditBox'

@registerInnerEditor()
export class ClipResizeEditor extends InnerEditor {
  public get tag() {
    return 'ClipResizeEditor'
  }

  // 完整虚像box
  vmBox = new Box({
    stroke: {
      type: 'solid',
      color: '#000000',
    },
    dashPattern: [3, 3],
  })

  // 虚像box 内的图片
  vmInner: IImage

  // 预览的图片
  previewTarget: ClipImage

  bakData: any

  // 编辑器
  myEditBox = new EditBox(this)

  constructor(props: any) {
    super(props)

    this.eventIds = [
      this.editor.app.on_(PointerEvent.DOUBLE_TAP, ({ target }: PointerEvent) => {
        if (target === this.editTarget || target?.parent === this.editTarget)
          return
        this.editor.closeInnerEditor()
      }),
    ]
  }

  get clipUI() {
    return this.editTarget as ClipImage
  }

  get clipInner() {
    return this.clipUI.layerImg
  }

  get previewInner() {
    return this.previewTarget.layerImg
  }

  onLoad() {
    this.editTarget.visible = false
    // 去除 editor 的描边
    this.editor.selector.targetStroker.visible = false
    // 添加备份, 用于取消
    this.bakData = this.clipUI.clone()
    this.previewTarget = this.clipUI.clone({ visible: true }) as ClipImage
    this.vmInner = this.clipInner.clone({
      opacity: 0.5,
      x: 0,
      y: 0,
      rotation: 0,
    }) as IImage
    this.vmBox.set({
      children: [this.vmInner],
    })
    this.view.addMany(this.vmBox, this.previewTarget, this.myEditBox)
    this.myEditBox.load()
    this.editor.add(this.view)
  }

  updateEditBox() {
    // if (this.myEditBox.dragging) {
    //   // return
    // }
    const targetLB = this.clipUI.getLayoutBounds('box', 'world', true)
    this.myEditBox.set(targetLB)
    this.myEditBox.update({
      x: 0,
      y: 0,
      width: targetLB.width,
      height: targetLB.height,
    })
  }

  onUpdate() {
    this.updateEditBox()
    const targetLB2 = this.clipUI.getLayoutBounds('box', 'world')
    this.previewTarget.set(targetLB2)
    const clipTrans = this.clipInner.getTransform('local')
    this.previewInner.setTransform(clipTrans)

    const clipBounds = this.previewInner.getLayoutBounds('box', 'world')
    // 更新完整图片的盒子
    this.vmBox.set(clipBounds)
    // 更新内部图片的盒子
    const clipInnerBounds = this.previewInner.getLayoutBounds('box', 'inner')
    this.vmInner.set({
      ...clipInnerBounds,
      scaleX: undefined,
      scaleY: undefined,
      skewX: undefined,
      skewY: undefined,
    })

    // fix: 不清楚为什么图片没加载, 尝试手动加载
    if (!this.vmInner.ready) {
      this.vmInner.load()
    }
  }

  onUnload() {
    this.closeInnerEditor()
    // 4. 卸载控制点
    this.editor.remove(this.view)
  }

  getScale() {
    return this.editor.app.zoomLayer.scaleX ?? 1
  }

  // 尺寸修改比较特殊，只需要修改编辑框、预览元素的尺寸，松手后才改变目标元素尺寸
  onScale(e: DragEvent) {
    console.log('scale xxx', e)
    const element = this.clipUI
    let { around, lockRatio, flipable, editSize } = this.editor.mergeConfig

    const { direction } = e.current as IEditPoint

    if (e.shiftKey || element.lockRatio)
      lockRatio = true

    const data = EditDataHelper.getScaleData(element, this.myEditBox.dragStartData.bounds, direction, e.getInnerTotal(element), lockRatio, EditDataHelper.getAround(around, e.altKey), flipable, editSize === 'scale')

    this.doScaleOf(data.origin, data.scaleX, data.scaleY)
    // if (this.editTool.onScaleWithDrag) {
    //   data.drag = e
    //   this.scaleWithDrag(data)
    // } else {
    //   this.scaleOf(data.origin, data.scaleX, data.scaleY)
    // }
  }

  doScaleOf(origin: IPointData | IAlign, scaleX: number, scaleY = scaleX, _resize?: boolean): void {
    const target = this.clipUI
    const worldOrigin = this.getWorldOrigin(origin)
    const data: IEditorScaleEvent = {
      target,
      editor: this.editor,
      worldOrigin,
      scaleX,
      scaleY,
      transform: null,
    }
    this.scale(data)
  }

  scale(event: IEditorScaleEvent) {
    const { target, scaleX, scaleY, worldOrigin, editor } = event
    this.clipUI.resizeChildren = false
    const { app } = editor
    app.lockLayout()
    const resize = editor.getEditSize(target) !== 'scale'
    this.clipUI.scaleOfWorld(worldOrigin, scaleX, scaleY, resize)
    this.onUpdate()
    app.unlockLayout()
    this.clipUI.resizeChildren = true
  }

  onRotate(e: DragEvent | RotateEvent) {
    const { mergeConfig } = this.editor
    const pi = this.previewInner
    const { rotateGap } = mergeConfig

    const { dragStartData } = this.myEditBox
    const origin = {} as IPointData
    let rotation: number

    // 计算预览区域的旋转数据, 旋转的时候，不管图片如何偏移，应该总是按照预览元素的中心点旋转
    const pt = this.previewTarget
    AroundHelper.toPoint('center', pt.boxBounds, origin, true)
    rotation = PointHelper.getRotation(
      pt.getBoxPoint(dragStartData),
      origin,
      e.getBoxPoint(pt),
    )

    if (pi.scaleX * pi.scaleY < 0)
      rotation = -rotation // flippedOne
    if (e instanceof DragEvent)
      rotation = dragStartData.rotation + rotation - pi.rotation

    rotation = MathHelper.float(MathHelper.getGapRotation(rotation, rotateGap, pi.rotation), 2)
    if (!rotation)
      return

    this.doRotateOf(origin, rotation)
  }

  doRotateOf(origin: IPointData | IAlign, rotation: number): void {
    const target = this.previewInner
    const worldOrigin = this.getWorldOrigin(origin)
    const data: IEditorRotateEvent = {
      target,
      editor: this.editor,
      worldOrigin,
      rotation,
      transform: undefined,
    }
    this.rotate(data)
  }

  protected getWorldOrigin(origin: IPointData | IAlign): IPointData {
    const element = this.previewTarget
    return element.getWorldPoint(LeafHelper.getInnerOrigin(element, origin))
  }

  rotate(e: IEditorRotateEvent) {
    const { app } = this.editor
    const { rotation, worldOrigin } = e
    app.lockLayout()
    this.clipInner.rotateOfWorld(worldOrigin, rotation)
    this.onUpdate()
    app.unlockLayout()
  }

  onMove(e: DragEvent | MoveEvent): void {
    const { mergeConfig } = this.editor
    const { moveable, resizeable } = mergeConfig
    const element = this.previewInner
    if (e instanceof MoveEvent) {
      if (e.moveType !== 'drag') {
        const move = e.getLocalMove(element)
        if (moveable === 'move') {
          e.stop()
          this.doMove(move.x, move.y)
        }
        else if (resizeable === 'zoom') {
          e.stop()
        }
      }
    }
    else {
      const total = { x: e.totalX, y: e.totalY }

      if (e.shiftKey) {
        if (Math.abs(total.x) > Math.abs(total.y))
          total.y = 0
        else total.x = 0
      }

      this.doMove(DragEvent.getValidMove(element, this.myEditBox.dragStartData.point, total))
    }
  }

  doMove(x: number | IPointData, y = 0) {
    if (typeof x === 'object') {
      y = x.y
      x = x.x
    }
    const target = this.previewInner
    const world = target.getWorldPointByLocal({ x, y }, null, true)
    const data: IEditorMoveEvent = {
      target,
      editor: this.editor,
      moveX: world.x,
      moveY: world.y,
    }
    this.move(data)
  }

  move(e: IEditorMoveEvent): void {
    const { app } = this.editor
    app.lockLayout()
    const total = { x: e.moveX, y: e.moveY }
    this.clipInner.moveWorld(total)
    this.onUpdate()
    app.unlockLayout()
  }

  closeInnerEditor() {
    this.editTarget.visible = true
    // 去除 editor 的描边
    this.editor.selector.targetStroker.visible = true
    this.editor.off_(this.eventIds)
    this.eventIds = []
    this.myEditBox.unload()
  }

  onDestroy() {
    [
      this.vmInner,
      this.vmBox,
      this.previewTarget,
      this.bakData,
      this.view,
      this.myEditBox,
    ].forEach((v) => {
      v.destroy()
      v = null
    })
    super.onDestroy()
  }
}
