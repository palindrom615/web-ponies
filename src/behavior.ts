import urlJoin from "proper-url-join";

import CIMap from "./cimap";
import Effect from "./effect";
import { WebPonies } from "./index";
import Pony from "./pony";
import Speech from "./speech";
import { AllowedMoves, Size } from "./types";

export default class Behavior {
  name: string;
  follow: string;
  movement: AllowedMoves = null;
  rightsize: Size = { width: 0, height: 0 };
  rightimage: string;
  rightcenter: { x: number; y: number; missing?: boolean };
  leftsize: Size = { width: 0, height: 0 };
  leftimage: string;
  leftcenter: { x: number; y: number; missing?: boolean };
  effects: Effect[] = [];
  effectsMap: CIMap<Effect> = new CIMap();
  x: number;
  y: number;
  skip?: boolean;
  group?: number;
  linked?;
  moving?;
  stopped;
  speed;
  autoSelectImages;
  minduration?;
  maxduration?;
  speakstart?: Speech;
  speakend?: Speech;
  dontRepeatAnimation?: boolean;
  probability?: number;

  webPonyRef: WebPonies;

  constructor(
    baseurl: string,
    behavior: Partial<Behavior>,
    webPony: WebPonies
  ) {
    this.webPonyRef = webPony;
    for (const entry in behavior) {
      if (behavior.hasOwnProperty(entry)) {
        this[entry] = behavior[entry];
      }
    }
    this.movement =
      AllowedMoves[
        Object.keys(AllowedMoves).find(
          mov =>
            mov.toLowerCase() ===
            behavior.movement.replace(/[-_\s]/g, "").toLowerCase()
        )
      ];

    if (!this.name || this.name.toLowerCase() === "none") {
      throw new Error(baseurl + ": illegal behavior name " + this.name);
    }

    if (this.movement === null) {
      throw new Error(
        baseurl +
          ": illegal movement " +
          behavior.movement +
          " for behavior " +
          behavior.name
      );
    }

    if (behavior.rightimage) {
      this.rightimage = urlJoin(baseurl, behavior.rightimage);
    }

    if (behavior.leftimage) {
      this.leftimage = urlJoin(baseurl, behavior.leftimage);
    }

    // XXX: bugfix for ini files: interprete (0, 0) as missing
    if (
      !this.rightcenter ||
      (this.rightcenter.x === 0 && this.rightcenter.y === 0)
    ) {
      this.rightcenter = { x: 0, y: 0, missing: true };
    }

    if (
      !this.leftcenter ||
      (this.leftcenter.x === 0 && this.leftcenter.y === 0)
    ) {
      this.leftcenter = { x: 0, y: 0, missing: true };
    }

    if ("effects" in behavior) {
      for (const effect of behavior.effects) {
        this.effectsMap.set(effect.name, effect);
      }
    }
  }
  deref(property: string, pony: Pony) {
    this[property] = undefined;
  }
  preload() {
    this.effects.forEach(effect => {
      effect.preload();
    });

    if (this.rightimage) {
      this.webPonyRef.preloadImage(this.rightimage, image => {
        this.rightsize.width = image.width;
        this.rightsize.height = image.height;
        if (this.rightcenter.missing) {
          this.rightcenter = {
            x: Math.round(image.width * 0.5),
            y: Math.round(image.height * 0.5)
          };
        }
      });
    }

    if (this.leftimage) {
      this.webPonyRef.preloadImage(this.leftimage, image => {
        this.leftsize.width = image.width;
        this.leftsize.height = image.height;
        if (this.leftcenter.missing) {
          this.leftcenter = {
            x: Math.round(image.width * 0.5),
            y: Math.round(image.height * 0.5)
          };
        }
      });
    }
  }
  isMoving(): boolean {
    if (this.follow || this.x || this.x) {
      return true;
    }
    switch (this.movement) {
      case AllowedMoves.None:
      case AllowedMoves.MouseOver:
      case AllowedMoves.Sleep:
        return false;
      default:
        return true;
    }
  }
}
