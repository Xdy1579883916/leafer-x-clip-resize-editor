import type { ILayoutBoundsData } from '@leafer-in/interface'
import type { IEventTarget } from '@leafer-ui/interface'
import { Event } from '@leafer-ui/core'

interface IClipResizeEditorEvent {
  readonly target?: IEventTarget
  readonly editBounds4World?: ILayoutBoundsData
  readonly editBounds4Window?: ILayoutBoundsData
}

const baseName = 'clipResizeEditor'
export class ClipResizeEditorEvent extends Event implements IClipResizeEditorEvent {
  // 更新编辑框
  static UPDATE_EDITOR_BOUNDS = [baseName, 'update-editor-bounds'].join('.')

  declare readonly target: IEventTarget

  declare readonly editBounds4World: ILayoutBoundsData
  declare readonly editBounds4Window: ILayoutBoundsData

  constructor(type: string, data?: IClipResizeEditorEvent) {
    super(type)
    if (data)
      Object.assign(this, data)
  }
}
