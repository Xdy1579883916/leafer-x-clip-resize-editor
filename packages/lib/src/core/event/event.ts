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
  static BEFORE_START = [baseName, 'before-start'].join('.')
  static START = [baseName, 'start'].join('.')
  static END = [baseName, 'end'].join('.')

  readonly target: IEventTarget

  readonly editBounds4World: ILayoutBoundsData
  readonly editBounds4Window: ILayoutBoundsData

  constructor(type: string, data?: IClipResizeEditorEvent) {
    super(type)
    if (data)
      Object.assign(this, data)
  }
}
