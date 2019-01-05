import urlJoin from 'proper-url-join';

import Behavior from './behavior';
import CIMap from './cimap';
import Effect from './effect';
import state from './globalState';
import Interaction from './interaction';
import Speech from './speech';
import { AllowedMoves } from './types';
import { createAudio, observe, partial } from './utils';

const preloadAudio = function(urls, callback?) {
  const loadAudio = function(audioUrls) {
    return function(loader, id, observer) {
      const audio = (loader.object = createAudio(audioUrls));
      observe(audio, 'loadeddata', partial(observer, true));
      observe(audio, 'error', partial(observer, false));
      observe(audio, 'abort', partial(observer, false));
      audio.preload = 'auto';
    };
  };
  const equalLength = function(s1: string, s2: string): number {
    const n = Math.min(s1.length, s2.length);
    for (let i = 0; i < n; ++i) {
      if (s1.charAt(i) !== s2.charAt(i)) { return i; }
    }
    return n;
  };
  let fakeurl;
  if (typeof urls === 'string') {
    fakeurl = urls;
  } else {
    const list = [];
    for (const type in urls) {
      if (urls.hasOwnProperty(type)) {
        list.push(urls[type]);
      }
    }
    if (list.length === 0) {
      throw new Error('no audio url to preload');
    } else if (list.length === 1) {
      fakeurl = list[0];
    } else {
      const common = list.reduce(
        (acc, val) => acc.slice(0, equalLength(acc, val)),
        list[0]
      );

      list.sort();
      fakeurl = common + '{' + list.join('|') + '}';
    }
  }

  state.preload(loadAudio(urls), fakeurl, callback);
};

export default class Pony {
  baseurl: string;
  name: string = '';
  behaviors: Behavior[] = [];
  behaviorgroups: { [group: number]: string };
  speeches: Speech[] = [];
  interactions: Interaction[] = [];
  categories: string[] = [];

  randomBehaviors: Behavior[] = [];
  mouseoverBehaviors: Behavior[] = [];
  draggedBehaviors: Behavior[] = [];
  standBehaviors: Behavior[] = [];
  behaviorsMap: CIMap<Behavior> = new CIMap();
  randomSpeeches: Speech[] = [];
  speechesMap: CIMap<Speech> = new CIMap();
  instances = [];

  constructor(pony) {
    if (!pony.behaviors || pony.behaviors.length === 0) {
      throw new Error('Pony ' + pony.name + ' has no behaviors.');
    }
    this.baseurl = urlJoin(state.globalBaseUrl, encodeURIComponent(pony.baseurl));
    this.name = pony.name;
    if (!this.name) {
      throw new Error(
        'pony with following base URL has no name: ' + this.baseurl
      );
    }
    this.behaviorgroups = pony.behaviorgroups || {};
    if (pony.categories) {
      this.categories = pony.categories;
    }

    if (pony.speeches) {
      this.speeches = pony.speeches.map((speak) => new Speech(speak, this.baseurl));
      this.randomSpeeches = this.speeches.filter((speech) => !speech.skip);
      for (const speech of this.speeches) {
        if (this.speechesMap.has(speech.name)) {
          console.warn(
            `${this.baseurl}: Speech name ${speech.name} of pony ${
            pony.name
            } is not unique.`
          );
        } else {
          this.speechesMap.set(speech.name, speech);
        }
        if (
          speech.group !== 0 &&
          !this.behaviorgroups.hasOwnProperty(speech.group)
        ) {
          console.warn(
            `${this.baseurl}: Speech ${
            speech.name
            } references unknown behavior group ${speech.group}.`
          );
        }
      }
    }

    if ('behaviors' in pony) {
      for (const partialBehavior of pony.behaviors) {
        const behavior = new Behavior(this.baseurl, partialBehavior);
        if (this.behaviorsMap.has(behavior.name)) {
          console.warn(
            `${this.baseurl}: Behavior name ${behavior.name} of pony ${
            pony.name
            } is not unique.`
          );
        } else {
          // semantics like Dektop Ponies where the
          // first match is used for linked behaviors
          this.behaviorsMap.set(behavior.name, behavior);
        }
        for (const speakevent of ['speakstart', 'speakend']) {
          const speechname = behavior[speakevent];
          if (speechname) {
            if (this.speechesMap.has(speechname)) {
              behavior[speakevent] = this.speechesMap.get(speechname);
            } else {
              console.warn(
                `${this.baseurl}: Behavior ${behavior.name} of pony ${
                pony.name
                } references non-existing speech ${behavior[speakevent]}.`
              );
              delete behavior[speakevent];
            }

          }
        }
        this.behaviors.push(behavior);
        if (!('skip' in behavior)) {
          behavior.skip = false;
        }
        if (!behavior.skip) { this.randomBehaviors.push(behavior); }

        switch (behavior.movement) {
          case AllowedMoves.MouseOver:
            this.mouseoverBehaviors.push(behavior);
            if (!behavior.skip) { this.standBehaviors.push(behavior); }
            break;

          case AllowedMoves.Dragged:
            this.draggedBehaviors.push(behavior);
            if (!behavior.skip) { this.standBehaviors.push(behavior); }
            break;

          case AllowedMoves.None:
            if (!behavior.skip) { this.standBehaviors.push(behavior); }
            break;
        }

        if ('group' in behavior) {
          if (
            behavior.group !== 0 &&
            !this.behaviorgroups.hasOwnProperty(behavior.group)
          ) {
            console.warn(
              `${this.baseurl}: Behavior ${
              behavior.name
              } references unknown behavior group ${behavior.group}.`
            );
          }
        } else {
          behavior.group = 0;
        }
      }

      if (
        this.draggedBehaviors.length === 0 &&
        this.mouseoverBehaviors.length > 0
      ) {
        this.draggedBehaviors = this.mouseoverBehaviors.slice();
      }

      if (this.standBehaviors.length === 0) {
        for (const behavior of this.behaviors) {
          if (behavior.movement === AllowedMoves.Sleep && !behavior.skip) {
            this.standBehaviors.push(behavior);
          }
        }
      }

      if (this.standBehaviors.length === 0) {
        console.warn(
          `${this.baseurl}: Pony ${
          this.name
          } has no (non-skip) non-moving behavior.`
        );
      } else if (this.mouseoverBehaviors.length === 0) {
        this.mouseoverBehaviors = this.standBehaviors.slice();
      }

      // dereference linked behaviors:
      for (const behavior of this.behaviors) {
        behavior.deref('linked', this);
        behavior.deref('stopped', this);
        behavior.deref('moving', this);
      }
    }
    if (pony.interactions) {
      this.interactions = pony.interactions.map((interaction) => this.addInteraction(interaction));
    }
    if (pony.effects) {
      for (const effect of pony.effects) {
        const behavior = effect.behavior;
        if (!this.behaviorsMap.has(behavior)) {
          console.warn(
            `${this.baseurl}: Effect ${effect.name} of pony ${pony.name} references \
          non-existing behavior ${effect.behavior}`
          );
        } else {
          this.behaviorsMap.get(behavior).effects.push(new Effect(this.baseurl, effect));
          delete effect.behavior;
        }
      }
    }
  }
  preload() {
    this.behaviors.forEach((behavior) => behavior.preload());

    if (state.audioEnabled) {
      for (const speech of this.speeches) {
        if (speech.files) {
          preloadAudio(speech.files);
        }
      }
    }
  }
  unspawnAll() {
    while (this.instances.length > 0) {
      this.instances[0].unspawn();
    }
  }
  addInteraction(interaction): Interaction {
    interaction = new Interaction(interaction);

    if (interaction.targets.length === 0) {
      console.warn(
        'Dropping interaction ' +
        interaction.name +
        ' of pony ' +
        this.name +
        ' because it has no targets.'
      );
      return null;
    }

    interaction.behavior = interaction.behaviors.filter((behavior) =>
      this.behaviorsMap.has(behavior)
    );

    if (interaction.behaviors.length === 0) {
      console.warn(
        'Dropping interaction ' +
        interaction.name +
        ' of pony ' +
        this.name +
        ' because it has no common behaviors.'
      );
      return null;
    }

    return interaction;
  }
}
