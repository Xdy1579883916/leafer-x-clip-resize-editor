import type { IEditPoint, IEditPointType } from '@leafer-in/interface'
import type { Direction9 } from '@leafer-ui/core'
import { Box } from '@leafer-ui/core'

export class EditPoint extends Box implements IEditPoint {
  public direction: Direction9
  public pointType: IEditPointType
}
