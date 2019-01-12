import { BaseZIndex } from './constants';
import Effect from './effect';
import { WebPonies } from './index';
import Instance from './instance';
import PonyInstance from './ponyInstance';
import { Locations, Pos, Size } from './types';
import { sample, tag } from './utils';

export default class EffectInstance extends Instance {
  pony: PonyInstance;
  effect: Effect;
  rightloc: Locations;
  leftloc: Locations;
  rightcenter: Locations;
  leftcenter: Locations;

  webPonyRef: WebPonies;

  constructor(pony, startTime, effect, webPony: WebPonies) {
    super();
    this.webPonyRef = webPony;
    this.pony = pony;
    this.startTime = startTime;
    let duration = effect.duration * 1000;
    duration = Math.max(duration - this.webPonyRef.config.fadeDuration, this.webPonyRef.config.fadeDuration);
    this.endTime = startTime + duration;
    this.effect = effect;

    let imgurl;
    if (pony.isFacingRight) {
      imgurl = this.effect.rightimage;
      this.currentSize = this.effect.rightsize;
      this.currentCenter = this.effect.rightCenterPoint;
    } else {
      imgurl = this.effect.leftimage;
      this.currentSize = this.effect.leftsize;
      this.currentCenter = this.effect.leftCenterPoint;
    }

    this.img = this.createImage(imgurl) as HTMLImageElement;

    const locs = ['rightloc', 'rightcenter', 'leftloc', 'leftcenter'];
    for (const name of locs) {
      let loc = effect[name];

      if (loc === Locations.Any) {
        loc = sample([
          Locations.Top,
          Locations.Bottom,
          Locations.Left,
          Locations.Right,
          Locations.BottomRight,
          Locations.BottomLeft,
          Locations.TopRight,
          Locations.TopLeft,
          Locations.Center
        ]);
      } else if (loc === Locations.AnyNotCenter) {
        loc = sample([
          Locations.Top,
          Locations.Bottom,
          Locations.Left,
          Locations.Right,
          Locations.BottomRight,
          Locations.BottomLeft,
          Locations.TopRight,
          Locations.TopLeft
        ]);
      }

      this[name] = loc;
    }
  }
  createImage(src: string): HTMLElement {
    return tag('img', {
      src,
      draggable: 'false',
      style: {
        position: 'fixed',
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: 'none',
        borderStyle: 'none',
        margin: '0',
        padding: '0',
        backgroundColor: 'transparent',
        width: this.currentSize.width + 'px',
        height: this.currentSize.height + 'px',
        zIndex: String(BaseZIndex)
      }
    });
  }
  name(): string {
    return this.effect.name;
  }
  clear() {
    if (this.img.parentNode) {
      this.img.parentNode.removeChild(this.img);
    }
  }
  updatePosition() {
    let loc: Locations;
    let center: Locations;
    if (this.pony.isFacingRight) {
      loc = this.rightloc;
      center = this.rightcenter;
    } else {
      loc = this.leftloc;
      center = this.leftcenter;
    }

    const size: Size = this.size();
    let pos: Pos;

    switch (center) {
      case Locations.Top:
        pos = { x: -size.width * 0.5, y: 0 };
        break;
      case Locations.Bottom:
        pos = { x: -size.width * 0.5, y: -size.height };
        break;
      case Locations.Left:
        pos = { x: 0, y: -size.height * 0.5 };
        break;
      case Locations.Right:
        pos = { x: -size.width, y: -size.height * 0.5 };
        break;
      case Locations.BottomRight:
        pos = { x: -size.width, y: -size.height };
        break;
      case Locations.BottomLeft:
        pos = { x: 0, y: -size.height };
        break;
      case Locations.TopRight:
        pos = { x: -size.width, y: 0 };
        break;
      case Locations.TopLeft:
        pos = { x: 0, y: 0 };
        break;
      case Locations.Center:
        pos = { x: -size.width * 0.5, y: -size.height * 0.5 };
        break;
    }

    const ponyRect = this.pony.topLeftRect();
    switch (loc) {
      case Locations.Top:
        pos.x += ponyRect.x + ponyRect.width * 0.5;
        pos.y += ponyRect.y;
        break;
      case Locations.Bottom:
        pos.x += ponyRect.x + ponyRect.width * 0.5;
        pos.y += ponyRect.y + ponyRect.height;
        break;
      case Locations.Left:
        pos.x += ponyRect.x;
        pos.y += ponyRect.y + ponyRect.height * 0.5;
        break;
      case Locations.Right:
        pos.x += ponyRect.x + ponyRect.width;
        pos.y += ponyRect.y + ponyRect.height * 0.5;
        break;
      case Locations.BottomRight:
        pos.x += ponyRect.x + ponyRect.width;
        pos.y += ponyRect.y + ponyRect.height;
        break;
      case Locations.BottomLeft:
        pos.x += ponyRect.x;
        pos.y += ponyRect.y + ponyRect.height;
        break;
      case Locations.TopRight:
        pos.x += ponyRect.x + ponyRect.width;
        pos.y += ponyRect.y;
        break;
      case Locations.TopLeft:
        pos.x += ponyRect.x;
        pos.y += ponyRect.y;
        break;
      case Locations.Center:
        pos.x += ponyRect.x + ponyRect.width * 0.5;
        pos.y += ponyRect.y + ponyRect.height * 0.5;
        break;
    }

    this.setTopLeftPosition(pos);
  }
  setImage(url) {
    if (this.currentImgUrl !== url) {
      this.img.src = this.currentImgUrl = url;
      this.img.style.width = this.currentSize.width + 'px';
      this.img.style.height = this.currentSize.height + 'px';
    }
  }
  update(currentTime, passedTime) {
    if (this.effect.follow) {
      this.updatePosition();

      let imgurl;
      if (this.pony.isFacingRight) {
        imgurl = this.effect.rightimage;
        this.currentSize = this.effect.rightsize;
        this.currentCenter = this.effect.rightCenterPoint;
      } else {
        imgurl = this.effect.leftimage;
        this.currentSize = this.effect.leftsize;
        this.currentCenter = this.effect.leftCenterPoint;
      }
      this.setImage(imgurl);
    }
    return !this.effect.duration || currentTime < this.endTime;
  }
  get currentPosition() {
    return this.pony.currentPosition;
  }
}
