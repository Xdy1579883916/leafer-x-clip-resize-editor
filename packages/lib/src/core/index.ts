import type { IEditorMoveEvent, IEditorRotateEvent, IEditorScaleEvent, IEditPoint } from '@leafer-in/interface'
import type { RotateEvent } from '@leafer-ui/core'
import type { IAlign, IImage, IPointData, IUI } from '@leafer-ui/interface'
import type { ClipImage } from '../ui/ClipImage'
import { InnerEditor, registerInnerEditor } from '@leafer-in/editor'
import { Box, DragEvent, LeafHelper, MathHelper, Matrix, MoveEvent, PointerEvent } from '@leafer-ui/core'
import { EditBox } from './display/EditBox'
import { ClipResizeEditorEvent } from './event/event'
import { EditDataHelper } from './tool/EditDataHelper'
import { toFixed } from './tool/util'

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

  bakData: ClipImage

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

  // 按比例设置尺寸
  updateClipRatio(ratio: string) {
    if (!ratio)
      return

    // 解析比例字符串，例如 "16:9"
    const [widthRatio, heightRatio] = ratio.split(':').map(Number)
    if (!widthRatio || !heightRatio)
      return

    // 获取初始化时的裁剪区域尺寸
    const currentBounds = this.bakData.getLayoutBounds('box', 'local')

    // 计算新的宽度和高度
    const aspectRatio = widthRatio / heightRatio
    let newWidth = Math.sqrt(currentBounds.width * currentBounds.height * aspectRatio)
    let newHeight = newWidth / aspectRatio

    // 确保新的尺寸不超过 初始化时的裁剪区域尺寸
    if (newWidth > currentBounds.width || newHeight > currentBounds.height) {
      if (newWidth / currentBounds.width > newHeight / currentBounds.height) {
        newWidth = currentBounds.width
        newHeight = newWidth / aspectRatio
      }
      else {
        newHeight = currentBounds.height
        newWidth = newHeight * aspectRatio
      }
    }

    this.updateClipSize(newWidth, newHeight, false)
  }

  // 按指定宽高设置尺寸
  updateClipSize(w: number, h: number, lockRatio: boolean) {
    const { width, height } = this.clipUI

    if (lockRatio) {
      const ratio = width / height
      // 判断是哪个值发生了变化
      if (w !== toFixed(width, 0)) {
        // 如果宽度变化，根据宽度计算高度
        h = w / ratio
      }
      else {
        // 如果高度变化，根据高度计算宽度
        w = h * ratio
      }
    }

    // 计算缩放比例
    const scaleX = w / width
    const scaleY = h / height

    // 初始化 resizeStartData，避免在 scale 方法中出现 undefined 错误
    this.myEditBox.resizeStartData = {
      inner: {
        transform_world: { ...this.editTarget.getTransform('world') },
      },
    }

    // 以中心点为基准进行缩放
    this.doScaleOf('center', scaleX, scaleY)
    // 让内部 clipInner 元素居中
    this.clipInner.set({
      x: (this.clipUI.width - this.clipInner.width) / 2,
      y: (this.clipUI.height - this.clipInner.height) / 2,
    })
  }

  onLoad() {
    this.editor.emitEvent(
      new ClipResizeEditorEvent(ClipResizeEditorEvent.BEFORE_START, {
        target: undefined,
        editBounds4World: undefined,
        editBounds4Window: undefined,
      }),
    )
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
    this.bakData = this.clipUI.clone() as ClipImage
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

    this.editor.emitEvent(
      new ClipResizeEditorEvent(ClipResizeEditorEvent.START, {
        target: this.clipUI,
        editBounds4World: undefined,
        editBounds4Window: undefined,
      }),
    )
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
    this.editor.emitEvent(
      new ClipResizeEditorEvent(ClipResizeEditorEvent.END, {
        target: undefined,
        editBounds4World: undefined,
        editBounds4Window: undefined,
      }),
    )
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

  getWorldOrigin(target: IUI, origin: IPointData | IAlign): IPointData {
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

  /**
   * 清理事件监听器
   * 外部可以主动调用此方法来清理事件监听器
   */
  clearEventListeners() {
    this.editor.off_(this.eventIds)
    this.eventIds = []
  }

  closeInnerEditor() {
    this.editTarget.visible = true
    this.editor.selector.targetStroker.visible = true
    this.clearEventListeners()
    this.view.removeAll()
    this.vmBox.removeAll()
    this.myEditBox.unload()
    this.recoveryKeyEventFun()
    this.editor.remove(this.view)
  }

  reset() {
    const bak = this.bakData.getBounds()
    this.clipUI.set({
      clip: this.bakData.clip,
      ...bak,
    })
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
