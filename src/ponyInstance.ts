import Behavior from './behavior';
import { BaseZIndex } from './constants';
import EffectInstance from './effectInstance';
import state from './globalState';
import Instance from './instance';
import Interaction from './interaction';
import Pony from './pony';
import { AllowedMoves, Movements, Pos, RemoveQueue } from './types';
import {
  clipToScreen,
  createAudio,
  distance,
  sample,
  tag,
  windowSize
} from './utils';

const removeAll = function(array, item) {
  array = array.filter((elem) => elem !== item);
};

export default class PonyInstance extends Instance {
  ponies: Map<string, Pony>;
  pony;
  mouseover: boolean = false;
  currentInteraction: Interaction = null;
  interactionTargets = null;
  interactionWait = 0;
  destPosition: Pos = { x: 0, y: 0 };
  currentBehavior: Behavior = null;
  paintBehavior: Behavior = null;
  isFacingRight: boolean = true;
  isStopAtDest = false;
  effects: EffectInstance[] = [];
  repeating = [];
  following;

  interactionInterval: number;

  constructor(pony, ponies) {
    super();
    this.ponies = ponies;

    this.pony = pony;
    this.img = this.createImage() as HTMLImageElement;

    this.clear();
  }
  createImage(): HTMLElement {
    const touch = function(evt) {
      evt.preventDefault();
      if (
        evt.touches.length > 1 ||
        (evt.type === 'touchend' && evt.touches.length > 0)
      ) {
        return;
      }
      const newEvt: MouseEvent = document.createEvent('MouseEvents');
      let type = null;
      let touched: Touch = null;
      switch (evt.type) {
        case 'touchstart':
          type = 'mousedown';
          touched = evt.changedTouches[0];
          break;
        case 'touchmove':
          type = 'mousemove';
          touched = evt.changedTouches[0];
          break;
        case 'touchend':
          type = 'mouseup';
          touched = evt.changedTouches[0];
          break;
      }
      newEvt.initMouseEvent(
        type,
        true,
        true,
        evt.target.ownerDocument.defaultView,
        1,
        touched.screenX,
        touched.screenY,
        touched.clientX,
        touched.clientY,
        evt.ctrlKey,
        evt.altKey,
        evt.shiftKey,
        evt.metaKey,
        0,
        null
      );
      evt.target.dispatchEvent(newEvt);
    };
    return tag('img', {
      draggable: 'false',
      style: {
        position: 'fixed',
        userSelect: 'none',
        borderStyle: 'none',
        margin: '0',
        padding: '0',
        backgroundColor: 'transparent',
        zIndex: String(BaseZIndex)
      },
      ondragstart(event) {
        event.preventDefault();
      },
      ontouchstart: touch,
      ontouchmove: touch,
      ontouchend: touch,
      ondblclick: () => {
        // debug output
        const pos = this.position();
        const duration = (this.endTime - this.startTime) / 1000;
        console.log(
          `${this.pony.name} does ${this.currentBehavior.name}${
          this.currentBehavior === this.paintBehavior
            ? ''
            : ' using ' + this.paintBehavior.name
          } for ${duration} seconds, is at ${pos.x} x ${pos.y} and ${
          this.following
            ? 'follows ' + this.following.name()
            : `wants to go to ${this.destPosition.x} x ${
            this.destPosition.y
            }`
          }. See:`,
          this
        );
      },
      onmousedown: (event) => {
        if (event.button === 0) {
          state.dragged = this;
          this.mouseover = true;
          // timer === null means paused/not running
          if (state.timer !== null) {
            this.nextBehavior(true);
          }
          event.preventDefault();
        }
      },
      onmouseover: () => {
        if (!this.mouseover) {
          this.mouseover = true;
          // timer === null means paused/not runnung
          if (
            state.timer !== null &&
            !this.isMouseOverOrDragging() &&
            (this.canMouseOver() || this.canDrag())
          ) {
            this.nextBehavior(true);
          }
        }
      },
      onmouseout: () => {
        // let target = event.target;
        // XXX: the img has no descendants but if it had it might still be correct in case
        //      the relatedTarget is an anchester of the img or any node that is not a child
        //      of img or img itself.
        //          if (this.mouseover && (target === this.img || !descendantOf(target, this.img))) {
        if (this.mouseover) {
          this.mouseover = false;
        }
      }
    });
  }
  isMouseOverOrDragging() {
    return (
      this.currentBehavior &&
      (this.currentBehavior.movement === AllowedMoves.MouseOver ||
        this.currentBehavior.movement === AllowedMoves.Dragged)
    );
  }
  canDrag() {
    if (!this.currentBehavior) {
      return this.pony.draggedBehaviors.length > 0;
    } else {
      const currentGroup = this.currentBehavior.group;
      return this.pony.draggedBehaviors.some(
        (behavior) => behavior.group === 0 || behavior.group === currentGroup
      );
    }
  }
  canMouseOver() {
    if (!this.currentBehavior) {
      return this.pony.mouseoverBehaviors.length > 0;
    } else {
      const currentGroup = this.currentBehavior.group;
      for (const behavior of this.pony.mouseoverBehaviors) {
        if (behavior.group === 0 || behavior.group === currentGroup) {
          return true;
        }
      }

      return false;
    }
  }
  get name() {
    return this.pony.name;
  }
  unspawn() {
    const currentTime = Date.now();
    if (this.effects) {
      for (let i = 0, n = this.effects.length; i < n; ++i) {
        state.removing.push({
          at: currentTime,
          element: this.effects[i].img
        });
      }
    }
    state.removing.push({
      at: currentTime,
      element: this.img
    });
    removeAll(this.pony.instances, this);
    removeAll(state.instances, this);
  }
  clear() {
    if (this.effects) {
      this.effects.forEach((effect) => effect.clear());
    }
    if (this.img.parentNode) {
      this.img.parentNode.removeChild(this.img);
    }
    this.mouseover = false;
    this.startTime = null;
    this.endTime = null;
    this.currentInteraction = null;
    this.interactionTargets = null;
    this.currentImgUrl = null;
    this.interactionWait = 0;
    this.currentPosition = { x: 0, y: 0 };
    this.destPosition = { x: 0, y: 0 };
    this.currentSize = { width: 0, height: 0 };
    this.currentCenter = { x: 0, y: 0 };
    this.zIndex = BaseZIndex;
    this.currentBehavior = null;
    this.paintBehavior = null;
    this.isFacingRight = true;
    this.isStopAtDest = false;
    this.effects = [];
    this.repeating = [];
  }
  interact(currentTime, interaction, targets) {
    let pony;
    const behavior = sample(interaction.behaviors);
    this.behave(this.pony.behaviorsMap.get(behavior));
    for (let i = 0, n = targets.length; i < n; ++i) {
      pony = targets[i];
      pony.behave(pony.pony.behaviorsMap.get(behavior));
      pony.currentInteraction = interaction;
    }
    this.currentInteraction = interaction;
    this.interactionTargets = targets;
  }
  speak(currentTime, speech) {
    if (state.dontSpeak) { return; }
    if (speech.text) {
      const duration: number = Math.max(speech.text.length * 150, 1000);
      const remove: RemoveQueue = { at: currentTime + duration, element: null };
      let text: HTMLElement = tag(
        'div',
        {
          ondblclick() {
            remove.at = Date.now();
          },
          style: {
            fontSize: '14px',
            color: '#294256',
            background: 'rgba(255,255,255,0.8)',
            position: 'fixed',
            visibility: 'hidden',
            margin: '0',
            padding: '4px',
            maxWidth: '250px',
            textAlign: 'center',
            borderRadius: '10px',
            MozBorderRadius: '10px',
            width: 'auto',
            height: 'auto',
            boxShadow: '2px 2px 12px rgba(0,0,0,0.4)',
            MozBoxShadow: '2px 2px 12px rgba(0,0,0,0.4)',
            zIndex: String(BaseZIndex + 9000)
          }
        },
        speech.text
      );
      remove.element = text;
      const rect = this.topLeftRect();
      state.overlay.appendChild(text);
      const x = Math.round(rect.x + rect.width * 0.5 - text.offsetWidth * 0.5);
      const y = rect.y + rect.height;
      text.style.left = x + 'px';
      text.style.top = y + 'px';
      text.style.visibility = '';
      state.removing.push(remove);
      text = null;
    }
    if (state.audioEnabled && speech.files) {
      const audio = createAudio(speech.files);
      audio.volume = state.volume;
      audio.play();
    }
  }
  update(currentTime, passedTime, winsize) {
    const curr = this.rect();
    let dest = null;
    let dist;
    if (this.following) {
      if (this.following.img.parentNode) {
        dest = this.destPosition;
        dest.x = this.following.currentPosition.x;

        if (this.following.isFacingRight) {
          dest.x +=
            this.currentBehavior.x -
            this.following.paintBehavior.rightcenter.x;
        } else {
          dest.x +=
            -this.currentBehavior.x +
            this.following.paintBehavior.leftcenter.x;
        }
        dest.y = this.following.currentPosition.y + this.currentBehavior.y;
        dist = distance(curr, dest);
        if (
          !this.currentBehavior.x &&
          !this.currentBehavior.y &&
          dist <= curr.width * 0.5
        ) {
          dest = null;
        }
      } else {
        this.following = null;
      }
    } else {
      dest = this.destPosition;
      if (dest) { dist = distance(curr, dest); }
    }

    let pos;
    if (dest) {
      const dx = dest.x - curr.x;
      const dy = dest.y - curr.y;
      const tdist =
        this.currentBehavior.speed * passedTime * 0.01 * state.globalSpeed;

      if (tdist >= dist) {
        pos = dest;
      } else {
        const scale = tdist / dist;
        pos = {
          x: Math.round(curr.x + scale * dx),
          y: Math.round(curr.y + scale * dy)
        };
      }

      if (pos.x !== dest.x) {
        this.setFacingRight(pos.x <= dest.x);
      } else if (this.following) {
        if (this.currentBehavior.autoSelectImages) {
          // TODO: mechanism for selecting behavior for current movement
        } else if (Math.round(tdist) === 0) {
          if (this.currentBehavior.stopped) {
            this.paintBehavior = this.currentBehavior.stopped;
          }
        } else {
          if (this.currentBehavior.moving) {
            this.paintBehavior = this.currentBehavior.moving;
          }
        }
        this.setFacingRight(this.following.isFacingRight);
      }
      this.setPosition(pos);
    } else {
      pos = curr;
    }

    // update associated effects:
    for (let i = 0; i < this.effects.length;) {
      const effect = this.effects[i];
      if (effect.update(currentTime, passedTime)) {
        ++i;
      } else {
        this.effects.splice(i, 1);
        state.removing.push({
          element: effect.img,
          at: currentTime
        });
      }
    }

    // check if some effects need to be repeated:
    for (let i = 0, n = this.repeating.length; i < n; ++i) {
      const what = this.repeating[i];
      if (what.at <= currentTime) {
        const inst = new EffectInstance(this, currentTime, what.effect);
        state.overlay.appendChild(inst.img);
        inst.updatePosition();
        this.effects.push(inst);
        what.at += what.effect.delay * 1000;
      }
    }

    if (
      this.interactionWait <= currentTime &&
      this.pony.interactions.length > 0 &&
      !this.currentInteraction
    ) {
      let sumprob = 0;
      const interactions = [];
      let interaction = null;
      for (let i = 0, n = this.pony.interactions.length; i < n; ++i) {
        interaction = this.pony.interactions[i];
        const targets = interaction.reachableTargets(curr);
        if (targets) {
          sumprob += interaction.probability;
          interactions.push([interaction, targets]);
        }
      }

      if (interactions.length > 0) {
        let dice = Math.random() * sumprob;
        let diceiter = 0;
        for (let i = 0, n = interactions.length; i < n; ++i) {
          interaction = interactions[i];
          diceiter += interaction.probability;
          if (dice <= diceiter) {
            break;
          }
        }

        // The probability is meant for an execution evere 100ms,
        // but I use a configurable interaction interval.
        dice = Math.random() * (100 / this.interactionInterval);
        if (dice <= interaction[0].probability) {
          this.interact(currentTime, interaction[0], interaction[1]);
          return;
        }
      }

      this.interactionWait += this.interactionInterval;
    }

    if (
      currentTime >= this.endTime ||
      (this.isStopAtDest &&
        this.destPosition.x === pos.x &&
        this.destPosition.y === pos.y)
    ) {
      this.nextBehavior();
      return;
    }

    if (this.following) { return; }

    const x1 = this.currentCenter.x;
    const y1 = this.currentCenter.y;
    const x2 = this.currentSize.width - x1;
    const y2 = this.currentSize.height - y1;
    const left = pos.x - x1;
    const right = pos.x + x2;
    const top = pos.y - y1;
    const bottom = pos.y + y2;

    // bounce of screen edges
    if (left <= 0) {
      if (this.destPosition.x < pos.x) {
        this.destPosition.x = Math.round(
          Math.max(pos.x + pos.x - this.destPosition.x, x1)
        );
      }
    } else if (right >= winsize.width) {
      if (this.destPosition.x > pos.x) {
        this.destPosition.x = Math.round(
          Math.min(pos.x + pos.x - this.destPosition.x, winsize.width - x2)
        );
      }
    }

    if (top <= 0) {
      if (this.destPosition.y < pos.y) {
        this.destPosition.y = Math.round(
          Math.max(pos.y + pos.y - this.destPosition.y, y1)
        );
      }
    } else if (bottom >= winsize.height) {
      if (this.destPosition.y > pos.y) {
        this.destPosition.y = Math.round(
          Math.min(pos.y + pos.y - this.destPosition.y, winsize.height - y2)
        );
      }
    }
  }
  getNearestInstance(name: string) {
    const nearObjects = [];
    const pos = this.position();
    const pony = this.ponies.get(name);

    if (!pony) {
      for (const inst of state.instances) {
        if (!this.loops(inst)) {
          for (let j = 0, m = inst.effects.length; j < m; ++j) {
            const effect: EffectInstance = inst.effects[j];
            if (effect.effect.name === name) {
              nearObjects.push([distance(pos, effect.position()), effect]);
            }
          }
        }
      }
    } else {
      for (let i = 0, n = pony.instances.length; i < n; ++i) {
        const inst = pony.instances[i];
        if (!this.loops(inst)) {
          nearObjects.push([distance(pos, inst.position()), inst]);
        }
      }
    }

    if (nearObjects.length === 0) {
      return null;
    }
    nearObjects.sort(function(lhs, rhs) {
      return lhs[0] - rhs[0];
    });
    return nearObjects[0][1];
  }
  nextBehavior(breaklink?) {
    const offscreen = this.isOffscreen();
    if (!breaklink && this.currentBehavior && this.currentBehavior.linked) {
      this.behave(this.currentBehavior.linked, offscreen);
    } else {
      if (this.currentInteraction) {
        const currentTime = Date.now();
        this.interactionWait =
          currentTime + this.currentInteraction.delay * 1000;
        if (this.interactionTargets) {
          // XXX: should I even do this or should I just let the targets do it?
          //      they do it anyway, because currentInteraction is also set for them
          //      if it wouldn't be set, they could break out of interactions
          for (let i = 0, n = this.interactionTargets.length; i < n; ++i) {
            this.interactionTargets[
              i
            ].interactionWait = this.interactionWait;
          }
          this.interactionTargets = null;
        }
        this.currentInteraction = null;
      }

      this.behave(this.randomBehavior(offscreen), offscreen);
    }
  }
  setFacingRight(value) {
    this.isFacingRight = value;
    let newimg;
    if (value) {
      newimg = this.paintBehavior.rightimage;
      this.currentSize = this.paintBehavior.rightsize;
      this.currentCenter = this.paintBehavior.rightcenter;
    } else {
      newimg = this.paintBehavior.leftimage;
      this.currentSize = this.paintBehavior.leftsize;
      this.currentCenter = this.paintBehavior.leftcenter;
    }
    if (newimg !== this.currentImgUrl) {
      this.img.src = this.currentImgUrl = newimg;
    }
  }
  behave(behavior: Behavior, moveIntoScreen?) {
    this.startTime = Date.now();
    const duration =
      behavior.minduration +
      (behavior.maxduration - behavior.minduration) * Math.random();
    this.endTime = this.startTime + duration * 1000;
    const previousBehavior = this.currentBehavior;
    this.currentBehavior = this.paintBehavior = behavior;

    const neweffects = [];
    for (let i = 0, n = this.effects.length; i < n; ++i) {
      const inst = this.effects[i];
      if (inst.effect.duration) {
        neweffects.push(inst);
      } else {
        state.removing.push({
          element: inst.img,
          at: this.startTime
        });
      }
    }

    // get new image + size
    if (this.isFacingRight) {
      this.currentSize = this.paintBehavior.rightsize;
      this.currentCenter = this.paintBehavior.rightcenter;
    } else {
      this.currentSize = this.paintBehavior.leftsize;
      this.currentCenter = this.paintBehavior.leftcenter;
    }

    let spoke = false;
    if (previousBehavior && previousBehavior.speakend) {
      this.speak(this.startTime, previousBehavior.speakend);
      spoke = true;
    }

    this.following = null;
    if (behavior.follow) {
      this.following = this.getNearestInstance(behavior.follow);
    }

    if (behavior.speakstart) {
      this.speak(this.startTime, behavior.speakstart);
    } else if (!spoke && !this.following && !this.currentInteraction) {
      this.speakRandom(this.startTime, state.speakProbability);
    }

    const pos = this.position();
    const size = this.size();
    const winsize = windowSize();
    this.isStopAtDest = false;
    if (this.following) {
      this.destPosition.x = this.following.currentPosition.x;
      this.destPosition.y = this.following.currentPosition.y;
    } else if (!behavior.follow && (behavior.x || behavior.y)) {
      this.isStopAtDest = true;
      this.destPosition = {
        x: Math.round(((winsize.width - size.width) * (behavior.x || 0)) / 100),
        y: Math.round(
          ((winsize.height - size.height) * (behavior.y || 0)) / 100
        )
      };
    } else {
      // reduce chance of going off-screen
      let movements = null;
      switch (behavior.movement) {
        case AllowedMoves.HorizontalOnly:
          movements = [Movements.Left, Movements.Right];
          break;

        case AllowedMoves.VerticalOnly:
          movements = [Movements.Up, Movements.Down];
          break;

        case AllowedMoves.HorizontalVertical:
          movements = [
            Movements.Left,
            Movements.Right,
            Movements.Up,
            Movements.Down
          ];
          break;

        case AllowedMoves.DiagonalOnly:
          movements = [
            Movements.UpLeft,
            Movements.UpRight,
            Movements.DownLeft,
            Movements.DownRight
          ];
          break;

        case AllowedMoves.DiagonalHorizontal:
          movements = [
            Movements.Left,
            Movements.Right,
            Movements.UpLeft,
            Movements.UpRight,
            Movements.DownLeft,
            Movements.DownRight
          ];
          break;

        case AllowedMoves.DiagonalVertical:
          movements = [
            Movements.Up,
            Movements.Down,
            Movements.UpLeft,
            Movements.UpRight,
            Movements.DownLeft,
            Movements.DownRight
          ];
          break;

        case AllowedMoves.All:
          movements = [
            Movements.Left,
            Movements.Right,
            Movements.Up,
            Movements.Down,
            Movements.UpLeft,
            Movements.UpRight,
            Movements.DownLeft,
            Movements.DownRight
          ];
          break;
      }

      if (movements === null) {
        this.destPosition.x = Math.round(pos.x);
        this.destPosition.y = Math.round(pos.y);
      } else {
        const nearTop = pos.y - size.height * 0.5 < 100;
        const nearBottom = pos.y + size.height * 0.5 + 100 > winsize.height;
        const nearLeft = pos.x - size.width * 0.5 < 100;
        const nearRight = pos.x + size.width * 0.5 + 100 > winsize.width;
        const reducedMovements = movements.slice();

        if (nearTop) {
          removeAll(reducedMovements, Movements.Up);
          removeAll(reducedMovements, Movements.UpLeft);
          removeAll(reducedMovements, Movements.UpRight);
        }

        if (nearBottom) {
          removeAll(reducedMovements, Movements.Down);
          removeAll(reducedMovements, Movements.DownLeft);
          removeAll(reducedMovements, Movements.DownRight);
        }

        if (nearLeft) {
          removeAll(reducedMovements, Movements.Left);
          removeAll(reducedMovements, Movements.UpLeft);
          removeAll(reducedMovements, Movements.DownLeft);
        }

        if (nearRight) {
          removeAll(reducedMovements, Movements.Right);
          removeAll(reducedMovements, Movements.UpRight);
          removeAll(reducedMovements, Movements.DownRight);
        }

        // speed is in pixels/100ms, duration is in sec
        const dist = behavior.speed * duration * 100 * state.globalSpeed;

        let a;
        switch (
        sample(reducedMovements.length === 0 ? movements : reducedMovements)
        ) {
          case Movements.Up:
            this.destPosition = {
              x: pos.x,
              y: pos.y - dist
            };
            break;
          case Movements.Down:
            this.destPosition = {
              x: pos.x,
              y: pos.y + dist
            };
            break;
          case Movements.Left:
            this.destPosition = {
              x: pos.x - dist,
              y: pos.y
            };
            break;
          case Movements.Right:
            this.destPosition = {
              x: pos.x + dist,
              y: pos.y
            };
            break;
          case Movements.UpLeft:
            a = Math.sqrt(dist * dist * 0.5);
            this.destPosition = {
              x: pos.x - a,
              y: pos.y - a
            };
            break;
          case Movements.UpRight:
            a = Math.sqrt(dist * dist * 0.5);
            this.destPosition = {
              x: pos.x + a,
              y: pos.y - a
            };
            break;
          case Movements.DownLeft:
            a = Math.sqrt(dist * dist * 0.5);
            this.destPosition = {
              x: pos.x - a,
              y: pos.y + a
            };
            break;
          case Movements.DownRight:
            a = Math.sqrt(dist * dist * 0.5);
            this.destPosition = {
              x: pos.x + a,
              y: pos.y + a
            };
            break;
        }

        if (moveIntoScreen) {
          this.destPosition = clipToScreen(
            Object.assign(this.destPosition, size)
          );
          this.isStopAtDest = true;
        } else {
          // clipToScreen already rounds
          this.destPosition.x = Math.round(this.destPosition.x);
          this.destPosition.y = Math.round(this.destPosition.y);
        }
      }
    }

    // this changes the image to the new behavior:
    this.setFacingRight(
      pos.x !== this.destPosition.x
        ? pos.x <= this.destPosition.x
        : this.isFacingRight
    );

    // this initializes the new images position:
    // (alternatively maybe this.update(...) could be called?)
    this.setPosition(this.currentPosition);

    this.repeating = [];
    for (const effect of behavior.effects) {
      const inst = new EffectInstance(this, this.startTime, effect);
      state.overlay.appendChild(inst.img);
      inst.updatePosition();
      neweffects.push(inst);

      if (effect.delay) {
        this.repeating.push({
          effect,
          at: this.startTime + effect.delay * 1000
        });
      }
    }
    this.effects = neweffects;
  }
  teleport() {
    const winsize = windowSize();
    const size = this.size();
    this.setTopLeftPosition({
      x: Math.random() * (winsize.width - size.width),
      y: Math.random() * (winsize.height - size.height)
    });
  }
  speakRandom(startTime, probability) {
    if (Math.random() >= probability) { return; }
    const filtered = [];
    const currentGroup = this.currentBehavior.group;
    for (let i = 0, n = this.pony.randomSpeeches.length; i < n; ++i) {
      const speech = this.pony.randomSpeeches[i];
      if (speech.group === 0 || speech.group === currentGroup) {
        filtered.push(speech);
      }
    }
    if (filtered.length > 0) {
      this.speak(startTime, sample(filtered));
    }
  }
  randomBehavior(forceMovement) {
    let behaviors;
    const currentGroup = this.currentBehavior ? this.currentBehavior.group : 0;

    if (this === state.dragged && this.canDrag()) {
      behaviors = this.pony.draggedBehaviors;
    } else if (this.mouseover && this.canMouseOver()) {
      behaviors = this.pony.mouseoverBehaviors;
    } else {
      behaviors = this.pony.randomBehaviors;
    }

    let sumprob = 0;
    const filtered = [];
    for (let i = 0, n = behaviors.length; i < n; ++i) {
      const behavior = behaviors[i];
      // don't filter looping behaviors because getNearestInstance filteres
      // looping instances and then it just degrades to a standard behavior
      if (forceMovement && !behavior.isMoving()) { continue; }
      if (
        currentGroup !== 0 &&
        behavior.group !== 0 &&
        behavior.group !== currentGroup
      ) {
        continue;
      }
      sumprob += behavior.probability;
      filtered.push(behavior);
    }
    const dice = Math.random() * sumprob;
    let diceiter = 0;
    for (const eachBehavior of filtered) {
      diceiter += eachBehavior.probability;
      if (dice <= diceiter) {
        return eachBehavior;
      }
    }
    return forceMovement ? this.randomBehavior(false) : null;
  }
  loops(instance) {
    while (instance) {
      if (this === instance) { return true; }
      instance = instance.following;
    }
    return false;
  }
}
