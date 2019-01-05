import state from './globalState';
import Pony from './pony';
import PonyInstance from './ponyInstance';
import { Config } from './types';
import { parseBoolean, sample } from './utils';

const onload = function(callback) {
  if (state.resourceLoadedCount === state.resourceCount) {
    callback();
  } else {
    state.onloadCallbacks.push(callback);
  }
};

const BrowserPonies = {
  addPonies(ponies: Array<Partial<Pony>>) {
    ponies.forEach((pony) => this.addPony(pony));
  },
  addPony(pony) {
    if (state.ponies.has(pony.baseurl)) {
      console.error('Pony ' + pony.baseurl + ' already exists.');
      return false;
    }
    state.ponies.set(pony.baseurl, new Pony(pony));
    return true;
  },
  removePonies(ponies: string[]) {
    ponies.forEach((pony) => this.removePony(pony));
  },
  removePony(baseurl: string) {
    if (state.ponies.has(baseurl)) {
      state.ponies.get(baseurl).unspawnAll();
      state.ponies.delete(baseurl);
    }
  },
  spawnRandom(count) {
    if (count === undefined) { count = 1; } else { count = parseInt(count, 10); }

    if (isNaN(count)) {
      console.error('unexpected NaN value');
      return [];
    }

    const spawned = [];
    while (count > 0) {
      let mininstcount = Infinity;

      for (const [name, pony] of state.ponies.entries()) {
        const instcount = pony.instances.length;
        if (instcount < mininstcount) {
          mininstcount = instcount;
        }
      }

      if (mininstcount === Infinity) {
        console.error(
          'can\'t spawn random ponies because there are no ponies loaded'
        );
        break;
      }

      const names = [];
      for (const [name, pony] of state.ponies.entries()) {
        if (pony.instances.length === mininstcount) {
          names.push(name);
        }
      }

      const randName = sample(names);

      if (this.spawn(randName)) {
        spawned.push(randName);
      }
      --count;
    }
    return spawned;
  },
  spawn(name, count) {
    if (!state.ponies.has(name)) {
      console.error('No such pony:', name);
      return false;
    }
    const pony = state.ponies.get(name);
    if (count === undefined) {
      count = 1;
    } else {
      count = parseInt(count, 10);
      if (isNaN(count)) {
        console.error('unexpected NaN value');
        return false;
      }
    }

    if (count > 0 && state.timer !== null) {
      pony.preload();
    }
    let n = count;
    while (n > 0) {
      const inst = new PonyInstance(pony, state.ponies);
      pony.instances.push(inst);
      if (state.timer !== null) {
        onload(() => {
          if (pony.instances.indexOf(inst) === -1) { return; }
          state.instances.push(inst);
          inst.img.style.visibility = 'hidden';
          state.getOverlay().appendChild(inst.img);
          inst.teleport();
          inst.nextBehavior();
          // fix position because size was initially 0x0
          inst.clipToScreen();
          inst.img.style.visibility = '';
        });
      } else {
        state.instances.push(inst);
      }
      --n;
    }
    return true;
  },
  unspawn(name, count) {
    if (!state.ponies.has(name)) {
      console.error('No such pony:', name);
      return false;
    }
    const pony = state.ponies.get(name);
    if (count === undefined) {
      count = pony.instances.length;
    } else {
      count = parseInt(count, 10);
      if (isNaN(count)) {
        console.error('unexpected NaN value');
        return false;
      }
    }
    if (count >= pony.instances.length) {
      pony.unspawnAll();
    } else {
      while (count > 0) {
        pony.instances[pony.instances.length - 1].unspawn();
        --count;
      }
    }
    return true;
  },
  unspawnAll() {
    for (const [_, pony] of state.ponies.entries()) {
      pony.unspawnAll();
    }
  },
  clear() {
    this.unspawnAll();
    state.ponies.clear();
  },
  preloadAll() {
    for (const [_, pony] of state.ponies.entries()) {
      pony.preload();
    }
  },
  preloadSpawned() {
    for (const [_, pony] of state.ponies.entries()) {
      if (pony.instances.length > 0) {
        pony.preload();
      }
    }
  },
  start() {
    if (state.preloadAll) {
      this.preloadAll();
    } else {
      this.preloadSpawned();
    }
    onload(function() {
      const overlay = state.getOverlay();
      overlay.innerHTML = '';
      for (const inst of state.instances) {
        inst.clear();
        inst.img.style.visibility = 'hidden';
        overlay.appendChild(inst.img);
        inst.teleport();
        inst.nextBehavior();
        // fix position because size was initially 0x0
        inst.clipToScreen();
        inst.img.style.visibility = '';
      }
      if (state.timer === null) {
        state.lastTime = Date.now();
        state.timer = window.setTimeout(state.tick.bind(state), 0);
      }
    });
  },
  timer() {
    return state.timer;
  },
  stop() {
    if (state.overlay) {
      state.overlay.parentNode.removeChild(state.overlay);
      state.overlay.innerHTML = '';
      state.overlay = null;
    }
    state.fpsDisplay = null;
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  },
  pause() {
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  },
  resume() {
    if (state.preloadAll) {
      this.preloadAll();
    } else {
      this.preloadSpawned();
    }
    onload(function() {
      if (state.timer === null) {
        state.lastTime = Date.now();
        state.timer = window.setTimeout(state.tick.bind(state), 0);
      }
    });
  },
  setInterval(ms) {
    ms = parseInt(ms, 10);
    if (isNaN(ms)) {
      console.error('unexpected NaN value for interval');
    } else if (state.interval !== ms) {
      state.interval = ms;
    }
  },
  getInterval() {
    return state.interval;
  },
  setFps(fps) {
    this.setInterval(1000 / Number(fps));
  },
  getFps() {
    return 1000 / state.interval;
  },
  setInteractionInterval(ms) {
    ms = Number(ms);
    if (isNaN(ms)) {
      console.error('unexpected NaN value for interaction interval');
    } else {
      state.interactionInterval = ms;
    }
  },
  getInteractionInterval() {
    return state.interactionInterval;
  },
  setSpeakProbability(probability) {
    probability = Number(probability);
    if (isNaN(probability)) {
      console.error('unexpected NaN value for speak probability');
    } else {
      state.speakProbability = probability;
    }
  },
  getSpeakProbability() {
    return state.speakProbability;
  },
  setDontSpeak(value) {
    state.dontSpeak = !!value;
  },
  isDontSpeak() {
    return state.dontSpeak;
  },
  setVolume(value) {
    value = Number(value);
    if (isNaN(value)) {
      console.error('unexpected NaN value for volume');
    } else if (value < 0 || value > 1) {
      console.error('volume out of range', value);
    } else {
      state.volume = value;
    }
  },
  getVolume() {
    return state.volume;
  },
  setBaseUrl(url) {
    state.globalBaseUrl = url;
  },
  getBaseUrl() {
    return state.globalBaseUrl;
  },
  setSpeed(speed) {
    state.globalSpeed = Number(speed);
  },
  getSpeed() {
    return state.globalSpeed;
  },
  setAudioEnabled(enabled) {
    if (typeof enabled === 'string') {
      try {
        enabled = parseBoolean(enabled);
      } catch (e) {
        console.error('illegal value for audio enabled', enabled, e);
        return;
      }
    } else {
      enabled = !!enabled;
    }
    if (state.audioEnabled !== enabled && enabled) {
      state.audioEnabled = enabled;
      if (state.preloadAll) {
        this.preloadAll();
      } else {
        this.preloadSpawned();
      }
    } else {
      state.audioEnabled = enabled;
    }
  },
  isAudioEnabled() {
    return state.audioEnabled;
  },
  setShowFps(value) {
    if (typeof value === 'string') {
      try {
        state.showFps = parseBoolean(value);
      } catch (e) {
        console.error('illegal value for show fps', value, e);
        return;
      }
    } else {
      state.showFps = !!value;
    }
    if (!state.showFps && state.fpsDisplay) {
      if (state.fpsDisplay.parentNode) {
        state.fpsDisplay.parentNode.removeChild(state.fpsDisplay);
      }
      state.fpsDisplay = null;
    }
  },
isShowFps() {
    return state.showFps;
  },
setPreloadAll(all) {
    if (typeof all === 'string') {
      try {
        state.preloadAll = parseBoolean(all);
      } catch (e) {
        console.error('illegal value for preload all', all, e);
        return;
      }
    } else {
      state.preloadAll = !!all;
    }
  },
isPreloadAll() {
    return state.preloadAll;
  },
setShowLoadProgress(show) {
    if (typeof show === 'string') {
      try {
        state.showLoadProgress = parseBoolean(show);
      } catch (e) {
        console.error(e);
        return;
      }
    } else {
      state.showLoadProgress = !!show;
    }
  },
isShowLoadProgress() {
    return state.showLoadProgress;
  },
getFadeDuration() {
    return state.fadeDuration;
  },
setFadeDuration(ms) {
    state.fadeDuration = Number(ms);
  },
running() {
    return state.timer !== null;
  },
ponies() {
    return state.ponies;
  },
loadConfig(config, data) {
    if ('baseurl' in config) {
      this.setBaseUrl(config.baseurl);
    }
    if ('speed' in config) {
      this.setSpeed(config.speed);
    }
    if ('speakProbability' in config) {
      this.setSpeakProbability(config.speakProbability);
    }
    if ('dontSpeak' in config) {
      this.setDontSpeak(config.dontSpeak);
    }
    if ('volume' in config) {
      this.setVolume(config.volume);
    }
    if ('interval' in config) {
      this.setInterval(config.interval);
    }
    if ('fps' in config) {
      this.setFps(config.fps);
    }
    if ('interactionInterval' in config) {
      this.setInteractionInterval(config.interactionInterval);
    }
    if ('audioEnabled' in config) {
      this.setAudioEnabled(config.audioEnabled);
    }
    if ('showFps' in config) {
      this.setShowFps(config.showFps);
    }
    if ('preloadAll' in config) {
      this.setPreloadAll(config.preloadAll);
    }
    if ('showLoadProgress' in config) {
      this.setShowLoadProgress(config.showLoadProgress);
    }
    if ('fadeDuration' in config) {
      this.setFadeDuration(config.fadeDuration);
    }
    if (data) {
      this.addPonies(data);
    }
    if (config.spawn) {
      for (const [name, pony] of Object.entries(config.spawn)) {
        this.spawn(name, pony);
      }
    }
    if ('spawnRandom' in config) {
      this.spawnRandom(config.spawnRandom);
    }
    if (config.onload) {
      if (Array.isArray(config.onload)) {
        for (let i = 0, n = config.onload.length; i < n; i++) {
          onload(config.onload[i]);
        }
      } else {
        onload(config.onload);
      }
    }
    if (config.autostart && state.timer === null) {
      this.start();
    }
  },
  // currently excluding ponies and interactions
  dumpConfig() {
    const config: Config = {
      baseurl: this.getBaseUrl(),
      speed: this.getSpeed(),
      speakProbability: this.getSpeakProbability(),
      dontSpeak: this.isDontSpeak(),
      volume: this.getVolume(),
      interval: this.getInterval(),
      fps: this.getFps(),
      interactionInterval: this.getInteractionInterval(),
      audioEnabled: this.isAudioEnabled(),
      showFps: this.isShowFps(),
      preloadAll: this.isPreloadAll(),
      showLoadProgress: this.isShowLoadProgress(),
      fadeDuration: this.getFadeDuration(),
      // TODO: optionally dump ponies and interactions
      spawn: {}
    };
    for (const [_, pony] of state.ponies.entries()) {
      if (pony.instances.length > 0) {
        config.spawn[pony.name] = pony.instances.length;
      }
    }

    return config;
  }
};

export default BrowserPonies;
