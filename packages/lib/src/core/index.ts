import type { IEditorMoveEvent, IEditorRotateEvent, IEditorScaleEvent, IEditPoint } from '@leafer-in/interface'
import type { RotateEvent } from '@leafer-ui/core'
import type { IAlign, IImage, IPointData, IUI } from '@leafer-ui/interface'
import type { ClipImage } from '../ui/ClipImage'
import { InnerEditor, registerInnerEditor } from '@leafer-in/editor'
import { Box, DragEvent, LeafHelper, MathHelper, Matrix, MoveEvent, PointerEvent } from '@leafer-ui/core'
import { EditBox } from './display/EditBox'
import { ClipResizeEditorEvent } from './event/event'
import { EditDataHelper } from './tool/EditDataHelper'

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

  // 关闭键盘监听后的恢复函数
  recoveryKeyEventFun = () => {}

  constructor(props: any) {
    super(props)
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

  handleDbClick({ target }: PointerEvent) {
    if (target === this.editTarget || target?.parent === this.editTarget) {
      return
    }
    this.editor.closeInnerEditor()
  }

  onLoad() {
    // 如果开启了键盘监听，则暂时关闭
    if (this.editor.config.keyEvent) {
      this.editor.config.keyEvent = false
      this.recoveryKeyEventFun = () => {
        this.editor.config.keyEvent = true
      }
    }

    this.eventIds = [
      this.editor.on_(PointerEvent.DOUBLE_TAP, this.handleDbClick, this),
    ]

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
    this.vmBox.add(this.vmInner)
    this.view.addMany(this.vmBox, this.previewTarget, this.myEditBox)
    this.myEditBox.load()
    this.editor.add(this.view)
  }

  updateEditBox() {
    const targetLB = this.clipUI.getLayoutBounds('box', 'world', true)
    this.myEditBox.set(targetLB)
    this.myEditBox.update({
      x: 0,
      y: 0,
      width: targetLB.width,
      height: targetLB.height,
    })

    this.editor.emitEvent(
      new ClipResizeEditorEvent(ClipResizeEditorEvent.UPDATE_EDITOR_BOUNDS, {
        target: this.clipUI,
        editBounds4World: targetLB,
        editBounds4Window: {
          ...targetLB,
          ...this.editor.leafer.getClientPointByWorld(targetLB),
        },
      }),
    )
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
  }

  onScale(e: DragEvent) {
    const target = this.clipUI
    let { lockRatio } = this.editor.mergeConfig
    const { direction } = e.current as IEditPoint
    if (e.shiftKey || target.lockRatio)
      lockRatio = true

    const data = EditDataHelper.getScaleData(
      target,
      this.myEditBox.dragStartData.bounds,
      direction,
      e.getInnerTotal(target),
      lockRatio,
      null,
      false,
      false,
    )
    this.doScaleOf(data.origin, data.scaleX, data.scaleY)
  }

  doScaleOf(origin: IPointData | IAlign, scaleX: number, scaleY = scaleX, _resize?: boolean): void {
    const target = this.clipUI
    const worldOrigin = this.getWorldOrigin(this.previewTarget, origin)
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
    const { scaleX, scaleY, worldOrigin, editor } = event
    const target = this.clipUI
    const { app } = editor
    const { resizeStartData } = this.myEditBox
    const { transform_world } = resizeStartData.inner
    app.lockLayout()
    target.resizeChildren = false
    target.scaleOfWorld(worldOrigin, scaleX, scaleY, true)
    target.resizeChildren = true
    app.unlockLayout()
    const matrx = new Matrix(transform_world)
    matrx.divideParent(target.getTransform('world'))
    this.clipInner.setTransform(matrx)
    this.onUpdate()
  }

  onRotate(e: DragEvent | RotateEvent) {
    const { mergeConfig } = this.editor
    const pi = this.previewInner
    const { rotateGap } = mergeConfig

    const { dragStartData } = this.myEditBox
    let rotation: number

    // 计算预览区域的旋转数据, 旋转的时候，不管图片如何偏移，应该总是按照预览元素的中心点旋转
    const pt = this.previewTarget

    const data = EditDataHelper.getRotateData(pt.boxBounds, 5, e.getBoxPoint(pt), pt.getBoxPoint(dragStartData), e.shiftKey ? null : ('center'))
    rotation = data.rotation

    if (pi.scaleX * pi.scaleY < 0)
      rotation = -rotation // flippedOne
    if (e instanceof DragEvent)
      rotation = dragStartData.rotation + rotation - pi.rotation

    rotation = MathHelper.float(MathHelper.getGapRotation(rotation, rotateGap, pi.rotation), 2)
    if (!rotation)
      return

    this.doRotateOf(data.origin, rotation)
  }

  doRotateOf(origin: IPointData | IAlign, rotation: number): void {
    const target = this.previewInner
    const worldOrigin = this.getWorldOrigin(this.previewTarget, origin)
    const data: IEditorRotateEvent = {
      target,
      editor: this.editor,
      worldOrigin,
      rotation,
      transform: undefined,
    }
    this.rotate(data)
  }

  protected getWorldOrigin(target: IUI, origin: IPointData | IAlign): IPointData {
    return target.getWorldPoint(LeafHelper.getInnerOrigin(target, origin))
  }

  rotate(e: IEditorRotateEvent) {
    const { app } = this.editor
    const { rotation, worldOrigin } = e
    app.lockLayout()
    this.clipInner.rotateOfWorld(worldOrigin, rotation)
    app.unlockLayout()
    this.onUpdate()
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
    app.unlockLayout()
    this.onUpdate()
  }

  closeInnerEditor() {
    this.editTarget.visible = true
    this.editor.selector.targetStroker.visible = true
    this.editor.off_(this.eventIds)
    this.eventIds = []
    this.view.removeAll()
    this.vmBox.removeAll()
    this.myEditBox.unload()
    this.recoveryKeyEventFun()
    this.editor.remove(this.view)
  }

  onDestroy() {
    this.handleDestroy([
      this.vmInner,
      this.vmBox,
      this.previewTarget,
      this.bakData,
      this.myEditBox,
    ])
    super.onDestroy()
  }

  handleDestroy(uis: IUI[]) {
    uis.forEach((ui) => {
      ui.destroy()
      ui = null
    })
  }
}
