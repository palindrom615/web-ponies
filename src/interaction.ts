import { WebPonies } from './index';
import { Pos } from './types';
import { distance } from './utils';

export default class Interaction {
  name: string;
  probability;
  proximity: number | 'default';
  activate: 'one' | 'all';
  delay;
  deploy;
  targets: string[] = [];
  behaviors: string[];

  webPonyRef: WebPonies;

  constructor(interaction: Partial<Interaction>, webPony: WebPonies) {
    this.webPonyRef = webPony;
    this.name = interaction.name;
    this.probability = interaction.probability;
    this.proximity =
      interaction.proximity === 'default' ? 640 : interaction.proximity;
    this.activate = interaction.activate;
    this.delay = interaction.delay;
    this.behaviors = interaction.behaviors;

    this.targets = interaction.targets;
    // for (const target of interaction.targets) {
    //   const name = target.toLowerCase();
    //   if (!ponies.hasOwnProperty(name)) {
    //     console.warn(
    //       `Interaction ${this.name} of pony ${
    //       interaction.pony
    //       } references non-existing pony ${name}`
    //     );
    //   } else {
    //     const pony = ponies[name];
    //     this.behaviors = this.behaviors.filter((behavior) =>
    //       pony.behaviorsMap.has(behavior)
    //     );
    //     this.targets.push(pony);
    //   }
    // }
  }
  reachableTargets(pos: Pos) {
    let res = [];
    for (const pony of this.targets) {
      let instance = null;
      let instanceDist = Infinity;
      for (const inst of this.webPonyRef.ponies.get(pony).instances) {
        const dist: number = distance(pos, inst.position());
        if (dist <= this.proximity && dist < instanceDist) {
          instance = inst;
          instanceDist = dist;
        }
      }
      if (instance) {
        res.push([instanceDist, instance]);
      } else if (this.activate === 'all') {
        return null;
      }
    }
    if (res.length === 0) {
      return null;
    }
    if (this.activate === 'one') {
      res.sort((lhs, rhs) => lhs[0] - rhs[0]);
      return [res[0][1]];
    } else {
      res = res.map((target) => target[1]);
    }
    return res;
  }
}
