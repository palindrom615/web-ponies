import CIMap from './cimap';
import { BASE_URL, BaseZIndex } from './constants';
import Pony from './pony';
import PonyInstance from './ponyInstance';
import Progressbar from './progressbar';
import { Callback, Config, Load, Loader, Pos, RemoveQueue, Resources } from './types';
import {
  createAudio,
  observe,
  parseBoolean,
  partial,
  sample,
  setOpacity,
  tag,
  windowSize
} from './utils';

export class WebPonies {
  overlay: HTMLDivElement = null;
  fpsDisplay: HTMLDivElement = null;
  mousePosition: Pos = null;
  dragged: PonyInstance = null;
  timer: number = null;
  instances: PonyInstance[] = [];
  removing: RemoveQueue[] = [];

  lastTime: number = Date.now();

  resources: Resources = {};
  resourceCount = 0;
  resourceLoadedCount = 0;
  onloadCallbacks: Callback[] = [];
  onProgressCallbacks: Callback[] = [];

  ponies: CIMap<Pony> = new CIMap();

  config: Config = {
    baseurl: BASE_URL.href + '/ponies',
    speed: 3,
    speakProbability: 0.1,
    dontSpeak: false,
    volume: 1.0,
    interval: 40,
    fps: 25,
    interactionInterval: 500,
    audioEnabled: true,
    showFps: false,
    isPreloadAll: false,
    showLoadProgress: true,
    fadeDuration: 500,
    spawn: {}
  };
  constructor() {
    this.initEvent();
    this.initProgress();
  }
  onload(cb) {
    if (this.resourceLoadedCount === this.resourceCount) {
      cb();
    } else {
      this.onloadCallbacks.push(cb);
    }
  }
  initEvent() {
    if (typeof document.hidden !== 'undefined') {
      observe(document, 'visibilitychange', () => {
        const documentHidden = () =>
          'hidden' in document ? document[name] : false;
        if (this.timer !== null) {
          if (documentHidden()) {
            clearTimeout(this.timer);
          } else {
            this.lastTime = Date.now();
            this.tick();
          }
        }
      });
    }
    observe(document, 'touchstart', () => {
      this.mousePosition = null;
    });
    observe(document, 'mousemove', (event) => {
      if (!this.mousePosition) {
        this.mousePosition = {
          x: event.clientX,
          y: event.clientY
        };
      }
      if (this.dragged) {
        this.dragged.moveBy({
          x: event.clientX - this.mousePosition.x,
          y: event.clientY - this.mousePosition.y
        });
        Object.assign(
          this.dragged.destPosition,
          this.dragged.currentPosition
        );
        event.preventDefault();
      }
      this.mousePosition.x = event.clientX;
      this.mousePosition.y = event.clientY;
    });
    observe(document, 'mouseup', () => {
      if (this.dragged) {
        const inst = this.dragged;
        this.dragged = null;
        if (this.timer !== null) {
          inst.nextBehavior();
        }
      }
    });
  }
  initProgress() {
    this.preload((loader: Loader, url, observer) => {
      if (document.body) {
        observer(true);
      } else {
        let loaded = false;
        const fireLoad = function() {
          if (!loaded) {
            loaded = true;
            observer(true);
          }
        };
        observe(document, 'DOMContentLoaded', fireLoad);
        // fallback
        observe(window, 'load', fireLoad);
      }
    }, document.location.href);

    const onprogress = (callback) => {
      this.onProgressCallbacks.push(callback);
    };

    const progressbar: Progressbar = new Progressbar();

    onprogress((loaded, total) => {
      if (this.config.showLoadProgress) {
        progressbar.renew(loaded, total);
      }
    });
  }
  getOverlay() {
    if (!this.overlay) {
      this.overlay = tag('div', { id: 'browser-ponies' }) as HTMLDivElement;
    }
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay);
    }
    return this.overlay;
  }
  tick() {
    if (this.timer === null) { return; }
    const currentTime = Date.now();
    const timeSpan = currentTime - this.lastTime;
    const winsize = windowSize();

    this.instances.forEach((instance) =>
      instance.update(currentTime, timeSpan, winsize)
    );

    // check if something needs to be removed:
    this.removing = this.removing.filter((what) => {
      if (what.at + this.config.fadeDuration <= currentTime) {
        if (what.element.parentNode) {
          what.element.parentNode.removeChild(what.element);
        }
      } else if (what.at <= currentTime) {
        setOpacity(
          what.element,
          1 - (currentTime - what.at) / this.config.fadeDuration
        );
      }
      return what.at + this.config.fadeDuration > currentTime;
    });

    if (this.config.showFps) {
      if (!this.fpsDisplay) {
        const overlay = this.getOverlay();
        this.fpsDisplay = tag('div', {
          style: {
            fontSize: '18px',
            position: 'fixed',
            bottom: '0',
            left: '0',
            zIndex: String(BaseZIndex + 9001)
          }
        }) as HTMLDivElement;
        overlay.appendChild(this.fpsDisplay);
      }

      this.fpsDisplay.innerHTML = Math.round(1000 / timeSpan) + ' fps';
    }

    this.timer = window.setTimeout(
      this.tick.bind(this),
      Math.max(this.config.interval - (currentTime - Date.now()), 0)
    );

    this.lastTime = currentTime;
  }
  preload(load: Load, url: string, callback?: Callback): void {
    if (url in this.resources) {
      if (callback) {
        const loader: Loader = this.resources[url];
        if (loader.loaded) {
          callback(loader.object);
        } else {
          loader.callbacks.push(callback);
        }
      }
    } else {
      ++this.resourceCount;
      const loader: Loader = (this.resources[url] = {
        loaded: false,
        callbacks: callback ? [callback] : []
      });

      const observer = (success) => {
        if (loader.loaded) {
          console.error('resource loaded twice: ' + url);
          return;
        }
        loader.loaded = true;
        ++this.resourceLoadedCount;
        if (!success) {
          console.error(
            `${this.resourceLoadedCount} of ${
              this.resourceCount
            } load error: ${url}`
          );
        }
        this.onProgressCallbacks.forEach((cb) =>
          cb(
            this.resourceLoadedCount,
            this.resourceCount,
            url,
            success
          )
        );
        loader.callbacks.forEach((cb) =>
          cb(loader.object, success)
        );
        loader.callbacks = [];

        if (this.resourceLoadedCount === this.resourceCount) {
          this.onloadCallbacks.forEach((cb) => cb());
          this.onloadCallbacks = [];
        }
      };

      load(loader, url, observer);
    }
  }
  preloadImage(url: string, callback) {
    const loadImage: Load = (loader, imageUrl, observer) => {
      const image: HTMLImageElement = new Image();
      loader.object = image;
      image.onload = partial(observer, true);
      image.onerror = partial(observer, false);
      image.onabort = partial(observer, false);
      image.src = imageUrl;
    };
    this.preload(loadImage, url, callback);
  }

  preloadAudio(urls, callback?) {
    const loadAudio = (audioUrls) => (loader, id, observer) => {
      const audio = createAudio(audioUrls);
      loader.object = audio;
      observe(audio, 'loadeddata', partial(observer, true));
      observe(audio, 'error', partial(observer, false));
      observe(audio, 'abort', partial(observer, false));
      audio.preload = 'auto';
    };
    const equalLength = (s1: string, s2: string) => {
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

    this.preload(loadAudio(urls), urls[1], callback);
  }

  addPonies(ponies: Partial<Pony>[]) {
    ponies.forEach((pony) => this.addPony(pony));
  }
  addPony(pony) {
    if (this.ponies.has(pony.baseurl)) {
      console.error('Pony ' + pony.baseurl + ' already exists.');
      return false;
    }
    this.ponies.set(pony.baseurl, new Pony(pony, this));
    return true;
  }
  removePonies(ponies: string[]) {
    ponies.forEach((pony) => this.removePony(pony));
  }
  removePony(baseurl: string) {
    if (this.ponies.has(baseurl)) {
      this.ponies.get(baseurl).unspawnAll();
      this.ponies.delete(baseurl);
    }
  }
  spawnRandom(count) {
    if (count === undefined) { count = 1; } else { count = parseInt(count, 10); }

    if (isNaN(count)) {
      console.error('unexpected NaN value');
      return [];
    }

    const spawned = [];
    while (count > 0) {
      let mininstcount = Infinity;

      for (const pony of this.ponies.values()) {
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
      for (const [name, pony] of this.ponies.entries()) {
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
  }
  spawn(name, count = 1) {
    if (!this.ponies.has(name)) {
      console.error('No such pony:', name);
      return false;
    }
    const pony = this.ponies.get(name);

    if (count > 0 && this.timer !== null) {
      pony.preload();
    }
    let n = count;
    while (n > 0) {
      const inst = new PonyInstance(pony, this.ponies, this);
      pony.instances.push(inst);
      if (this.timer !== null) {
        this.onload(() => {
          if (pony.instances.indexOf(inst) === -1) { return; }
          this.instances.push(inst);
          inst.img.style.visibility = 'hidden';
          this.getOverlay().appendChild(inst.img);
          inst.teleport();
          inst.nextBehavior();
          // fix position because size was initially 0x0
          inst.clipToScreen();
          inst.img.style.visibility = '';
        });
      } else {
        this.instances.push(inst);
      }
      --n;
    }
    return true;
  }
  unspawn(name, count) {
    if (!this.ponies.has(name)) {
      console.error('No such pony:', name);
      return false;
    }
    const pony = this.ponies.get(name);
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
  }
  unspawnAll() {
    for (const pony of this.ponies.values()) {
      pony.unspawnAll();
    }
  }
  clear() {
    this.unspawnAll();
    this.ponies.clear();
  }
  preloadAll() {
    for (const pony of this.ponies.values()) {
      pony.preload();
    }
  }
  preloadSpawned() {
    for (const pony of this.ponies.values()) {
      if (pony.instances.length > 0) {
        pony.preload();
      }
    }
  }
  start() {
    if (this.config.isPreloadAll) {
      this.preloadAll();
    } else {
      this.preloadSpawned();
    }
    this.onload(() => {
      const overlay = this.getOverlay();
      overlay.innerHTML = '';
      for (const inst of this.instances) {
        inst.clear();
        inst.img.style.visibility = 'hidden';
        overlay.appendChild(inst.img);
        inst.teleport();
        inst.nextBehavior();
        // fix position because size was initially 0x0
        inst.clipToScreen();
        inst.img.style.visibility = '';
      }
      if (this.timer === null) {
        this.lastTime = Date.now();
        this.timer = window.setTimeout(this.tick.bind(this), 0);
      }
    });
  }
  stop() {
    if (this.overlay) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay.innerHTML = '';
      this.overlay = null;
    }
    this.fpsDisplay = null;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  pause() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  resume() {
    if (this.config.isPreloadAll) {
      this.preloadAll();
    } else {
      this.preloadSpawned();
    }
    this.onload(() => {
      if (this.timer === null) {
        this.lastTime = Date.now();
        this.timer = window.setTimeout(this.tick.bind(this), 0);
      }
    });
  }
  set fps(fps: number) {
    this.config.interval = 1000 / fps;
  }
  get fps() {
    return 1000 / this.config.interval;
  }

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
    if (this.config.audioEnabled !== enabled && enabled) {
      this.config.audioEnabled = enabled;
      if (this.config.isPreloadAll) {
        this.preloadAll();
      } else {
        this.preloadSpawned();
      }
    } else {
      this.config.audioEnabled = enabled;
    }
  }
  setShowFps(value) {
    if (typeof value === 'string') {
      try {
        this.config.showFps = parseBoolean(value);
      } catch (e) {
        console.error('illegal value for show fps', value, e);
        return;
      }
    } else {
      this.config.showFps = !!value;
    }
    if (!this.config.showFps && this.fpsDisplay) {
      if (this.fpsDisplay.parentNode) {
        this.fpsDisplay.parentNode.removeChild(this.fpsDisplay);
      }
      this.fpsDisplay = null;
    }
  }
  running() {
    return this.timer !== null;
  }
  loadConfig(config: Partial<Config>, data) {
    this.config = {
      ...this.config,
      ...config
    };
    if ('audioEnabled' in config) {
      this.setAudioEnabled(config.audioEnabled);
    }
    if ('showFps' in config) {
      this.setShowFps(config.showFps);
    }
    if (data) {
      this.addPonies(data);
    }
    if (config.spawn) {
      for (const [name, num] of Object.entries(config.spawn)) {
        this.spawn(name, num);
      }
    }
    if ('spawnRandom' in config) {
      this.spawnRandom(config.spawnRandom);
    }
    if (config.onload) {
      if (Array.isArray(config.onload)) {
        for (let i = 0, n = config.onload.length; i < n; i++) {
          this.onload(config.onload[i]);
        }
      } else {
        this.onload(config.onload);
      }
    }
    if (config.autoStart && this.timer === null) {
      this.start();
    }
  }
  // currently excluding ponies and interactions
  dumpConfig() {
    const config: Config = { ...this.config };
    for (const [name, pony] of this.ponies.entries()) {
      if (pony.instances.length > 0) {
        config.spawn[name] = pony.instances.length;
      }
    }

    return config;
  }
}
