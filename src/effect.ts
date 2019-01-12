import urlJoin from 'proper-url-join';

import { WebPonies } from './index';
import { Locations, Pos, Size } from './types';

const parseLocation = function(value: string): string {
  const loc = value.replace(/[-_\s]/g, '').toLowerCase();
  if (Object.keys(Locations).map((location) => location.toLowerCase()).includes(loc)) {
    return Locations[loc];
  }
  throw new Error('illegal location: ' + value);
};

export default class Effect {
  name: string;
  rightsize: Size = { width: 0, height: 0 };
  rightCenterPoint: Pos = { x: 0, y: 0 };
  rightimage: string;

  leftsize: Size = { width: 0, height: 0 };
  leftCenterPoint: Pos = { x: 0, y: 0 };
  leftimage: string;

  follow?;
  duration?;
  delay?;
  behavior?;
  dontRepeatAnimation?: boolean;

  rightloc?;
  rightcenter?;
  leftloc?;
  leftcenter?;

  webPonyRef: WebPonies;

  constructor(baseurl: string, effect: Partial<Effect>, webPony: WebPonies) {
    this.webPonyRef = webPony;
    for (const entry in effect) {
      if (effect.hasOwnProperty(entry)) {
        this[entry] = effect[entry];
      }
    }

    this.name = effect.name;

    if (effect.rightimage) {
      this.rightimage = urlJoin(baseurl, effect.rightimage);
    }

    if (effect.leftimage) {
      this.leftimage = urlJoin(baseurl, effect.leftimage);
    }
  }
  preload() {
    if (this.rightimage) {
      this.webPonyRef.preloadImage(this.rightimage, (image) => {
        this.rightsize.width = image.width;
        this.rightsize.height = image.height;
        this.rightCenterPoint = {
          x: Math.round(image.width * 0.5),
          y: Math.round(image.height * 0.5)
        };
      });
    }

    if (this.leftimage) {
      this.webPonyRef.preloadImage(this.leftimage, (image) => {
        this.leftsize.width = image.width;
        this.leftsize.height = image.height;
        this.leftCenterPoint = {
          x: Math.round(image.width * 0.5),
          y: Math.round(image.height * 0.5)
        };
      });
    }
  }
}
