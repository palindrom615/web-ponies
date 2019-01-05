import { BaseZIndex } from './constants';
import { Pos, Rect, Size } from './types';
import { clipToScreen, windowSize } from './utils';

const isOffscreen = function(rectangle: Rect) {
  // rect has origin at center
  // area is only a size
  const isOutsideOf = function(rect: Rect, area: Size) {
    const wh = rect.width * 0.5;
    const hh = rect.height * 0.5;
    return (
      rect.x < wh ||
      rect.y < hh ||
      rect.x + wh > area.width ||
      rect.y + hh > area.height
    );
  };
  return isOutsideOf(rectangle, windowSize());
};

export default abstract class Instance {
  startTime: number = null;
  endTime: number = null;
  currentImgUrl: string = null;
  currentPosition: Pos;
  currentSize: Size;
  currentCenter: Pos;
  img: HTMLImageElement;
  zIndex: number = BaseZIndex;

  abstract update(currentTime: number, pastTime: number, winsize: Size): void;
  setTopLeftPosition(pos: Pos = { x: 0, y: 0 }) {
    this.currentPosition.x = pos.x + this.currentCenter.x;
    this.currentPosition.y = pos.y + this.currentCenter.y;
    this.img.style.left = Math.round(pos.x) + 'px';
    this.img.style.top = Math.round(pos.y) + 'px';
    const zIndex: number = Math.round(BaseZIndex + pos.y + this.currentSize.height);
    if (this.zIndex !== zIndex) {
      this.img.style.zIndex = String(zIndex);
    }
  }
  setPosition(pos) {
    const x = (this.currentPosition.x = pos.x);
    const y = (this.currentPosition.y = pos.y);
    const top = Math.round(y - this.currentCenter.y);
    this.img.style.left = Math.round(x - this.currentCenter.x) + 'px';
    this.img.style.top = top + 'px';
    const zIndex: number = Math.round(BaseZIndex + top + this.currentSize.height);
    if (this.zIndex !== zIndex) {
      this.img.style.zIndex = String(zIndex);
    }
  }
  moveBy(offset) {
    this.setPosition({
      x: this.currentPosition.x + offset.x,
      y: this.currentPosition.y + offset.y
    });
  }
  clipToScreen() {
    this.setPosition(clipToScreen(this.rect()));
  }
  topLeftPosition() {
    return {
      x: this.currentPosition.x - this.currentCenter.x,
      y: this.currentPosition.y - this.currentCenter.y
    };
  }
  position() {
    return this.currentPosition;
  }
  size() {
    return this.currentSize;
  }
  rect() {
    // lets abuse for speed (avoid object creation)
    const pos: Rect = {
      ...this.currentPosition,
      ...this.currentSize
    };
    return pos;
  }
  topLeftRect() {
    const pos = this.topLeftPosition();
    const size = this.size();
    return {
      x: pos.x,
      y: pos.y,
      width: size.width,
      height: size.height
    };
  }
  isOffscreen() {
    return isOffscreen(this.rect());
  }
}
