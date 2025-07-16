import type {
  IBox,
  IBoxData,
  IBoxInputData,
  IImage,
  IImageInputData,
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
  __updateLayerImg: (reset?: boolean) => void
}

export interface IClipImageData extends IClipImageAttrs, IBoxData {
  layerImg?: IImage
}

export interface IClipImageInputData extends IClipImageAttrs, IBoxInputData {
}

// 数据处理器
export class ClipImageData extends BoxData implements IClipImageData {
  public __leaf: IClipImage

  layerImg = new Image()

  _url?: string
  _clip?: IClipAttr

  protected setUrl(value: string) {
    // 重设图片链接的时候对裁剪信息进行重置
    const needRest = this._url && value && value !== this._url
    this._url = value
    setTimeout(() => {
      this.__leaf.__updateLayerImg(needRest)
    }, 0)
  }

  protected setClip(value?: IClipAttr) {
    this._clip = value
    setTimeout(() => {
      this.__leaf.__updateLayerImg()
    }, 0)
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
  public __: IClipImageData

  // 图片链接 同Image元素
  @boundsType('')
  public url?: IString

  // 裁剪的数据
  @surfaceType()
  public clip?: IClipAttr

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

    // 未设置宽高时 主动更新元素宽高
    if (!data.width && !data.height) {
      // 监听图片加载
      this.layerImg.once(ImageEvent.LOADED, (e: ImageEvent) => {
        this.width = this.layerImg.width = e.image.width
        this.height = this.layerImg.height = e.image.height
      })
    }

    // 添加为子元素
    this.add(this.layerImg)

    this.__updateLayerImg()
  }

  __updateLayerImg(reset?: boolean) {
    const { url, width, height, clip, layerImg } = this

    const inputImage: IImageInputData = {
      url,
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      origin: 'center',
    }

    if (reset) {
      layerImg.set(inputImage)
    }
    else if (layerImg && url) {
      layerImg.set({
        ...inputImage,
        ...(clip || {}),
      })
    }
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
