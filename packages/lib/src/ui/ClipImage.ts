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
import { boundsType, Box, BoxData, dataProcessor, Image, ImageEvent, registerUI, surfaceType } from '@leafer-ui/core'

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
  layerImg?: IImage
}

export interface IClipImageData extends IClipImageAttrs, IBoxData {
  layerImg?: IImage
  __updateLayerImg: () => void
}

export interface IClipImageInputData extends IClipImageAttrs, IBoxInputData {
}

// 数据处理器
export class ClipImageData extends BoxData implements IClipImageData {
  declare public __leaf: IClipImage

  layerImg = new Image()

  _url?: string
  _clip?: IClipAttr

  protected setUrl(value: string) {
    if (value && value !== this._url) {
      this._clip = ({})
    }
    this._url = value
    this.__updateLayerImg()
  }

  protected setClip(value: IClipAttr) {
    const { layerImg } = this
    this._clip = value || {}
    if (layerImg) {
      layerImg.set(this._clip)
    }
  }

  __updateLayerImg() {
    const { _width, _height, layerImg } = this
    if (layerImg && this._url) {
      layerImg.set({
        url: this._url,
        x: 0,
        y: 0,
        width: _width,
        height: _height,
        rotation: 0,
        origin: 'center',
        ...(this._clip || {}),
      })
    }
  }

  public __getInputData(): IObject {
    const data = super.__getInputData()
    const { x, y, width, height, rotation } = this.__leaf.layerImg
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
  declare public url?: IString

  // 裁剪的数据
  @surfaceType()
  declare public clip?: IClipAttr

  public get layerImg(): IImage {
    return this.__.layerImg
  }

  constructor({ clip, ...data }: IClipImageInputData = {}) {
    if (!clip) {
      clip = {
        x: 0,
        y: 0,
        width: data.width,
        height: data.height,
        rotation: 0,
      }
    }

    super({
      ...data,
      clip,
      overflow: 'hide',
      resizeChildren: true,
    } as IClipImageInputData)

    // 监听图片加载
    this.on(ImageEvent.LOADED, (e: ImageEvent) => {
      const size = {
        width: e.image.width,
        height: e.image.height,
      }
      // 未设置宽高时 主动更新元素宽高
      if (!data.width && !data.height) {
        this.set(size)
        this.layerImg.set(size)
      }
    })
    // 添加为子元素
    if (this.layerImg) {
      this.add(this.layerImg)
    }
    this.__.__updateLayerImg()
  }

  toJSON(options?: IJSONOptions): IUIJSONData {
    const data = super.toJSON(options)
    // 只删除我们不想序列化的属性
    const { children, overflow, resizeChildren, ...cleanData } = data
    return cleanData
  }

  public destroy(): void {
    if (this.layerImg) {
      this.layerImg.destroy()
      this.__.layerImg = null
    }
    super.destroy()
  }
}
