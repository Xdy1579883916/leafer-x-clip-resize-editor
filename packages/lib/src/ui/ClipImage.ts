import type {
  IBox,
  IBoxData,
  IBoxInputData,
  IImage,
  IJSONOptions,
  IObject,
  IString,
  IUIJSONData,
} from '@leafer-ui/interface'
import { boundsType, Box, BoxData, dataProcessor, Image, registerUI, surfaceType } from '@leafer-ui/core'

interface IClipAttr {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
}

export interface IClipImageAttrs {
  url?: string
  clip?: IClipAttr
}

export interface IClipImage extends IClipImageAttrs, IBox {
  __: IClipImageData
  readonly layerImg?: IImage
}

export interface IClipImageData extends IClipImageAttrs, IBoxData {
  layerImg?: IImage
}

export interface IClipImageInputData extends IClipImageAttrs, IBoxInputData {
}

// 数据处理器
export class ClipImageData extends BoxData implements IClipImageData {
  declare public __leaf: IClipImage

  _url?: string

  setUrl(value: string) {
    const { width, height } = this.__leaf
    this.__leaf.__.layerImg = new Image({
      url: value,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      origin: 'center',
    })
    this._url = value
  }

  _clip?: IClipAttr

  setClip(value: IClipAttr) {
    this._clip = value || {}
    this.__leaf.__.layerImg.set(value)
  }

  public __getInputData(): IObject {
    const data = super.__getInputData()
    const { x, y, width, height, rotation } = this.__leaf.__.layerImg
    return {
      ...data,
      clip: { x, y, width, height, rotation },
    }
  }
}

@registerUI()
export class ClipImage extends Box implements IClipImage {
  public get __tag() {
    return 'ClipImage'
  }

  @dataProcessor(ClipImageData)
  declare public __: IClipImageData

  // 图片链接 同Image元素
  @boundsType('')
  public url?: IString

  // 裁剪的数据
  @surfaceType()
  public clip?: IClipAttr

  public get layerImg(): IImage {
    return this.__.layerImg
  }

  constructor(data: IClipImageInputData) {
    super({
      ...data,
      overflow: 'hide',
      resizeChildren: true,
    })
    this.set({
      children: [
        this.layerImg,
      ],
    })
  }

  toJSON(options?: IJSONOptions): IUIJSONData {
    const data = super.toJSON(options)
    delete data.children
    delete data.overflow
    delete data.resizeChildren
    return data
  }
}
