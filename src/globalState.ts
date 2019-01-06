import CIMap from './cimap';
import { BASE_URL, BaseZIndex } from './constants';
import Pony from './pony';
import PonyInstance from './ponyInstance';
import { Callback, Load, Loader, Pos, RemoveQueue, Resources } from './types';
import {
  observe,
  partial,
  setOpacity,
  stopObserving,
  tag,
  windowSize
} from './utils';

class GlobalState {
  overlay: HTMLDivElement = null;
  showFps: boolean = false;
  fpsDisplay: HTMLDivElement = null;
  mousePosition: Pos = null;
  dragged: PonyInstance = null;
  timer: number = null;
  fadeDuration: number = 500;
  instances: PonyInstance[] = [];
  removing: RemoveQueue[] = [];
  interval = 40;
  dontSpeak: boolean = false;
  globalSpeed = 3; // why is it too slow otherwise?
  audioEnabled: boolean = false;
  interactionInterval = 500;
  speakProbability = 0.1;
  globalBaseUrl: string = BASE_URL.href + '/ponies';
  volume = 1.0;

  lastTime: number = Date.now();

  resources: Resources = {};
  resourceCount = 0;
  resourceLoadedCount = 0;
  onloadCallbacks: Callback[] = [];
  onProgressCallbacks: Callback[] = [];

  preloadAll = false;
  showLoadProgress = true;
  ponies: CIMap<Pony> = new CIMap();

  constructor() {
    this.initEvent();
    this.initProgress();
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

    let progressbar = null;
    const insertProgressbar = () => {
      document.body.appendChild(progressbar.container);
      centerProgressbar();
      setTimeout(function() {
        if (progressbar && !progressbar.finished) {
          progressbar.container.style.display = '';
        }
      }, 250);
      observe(window, 'resize', centerProgressbar);
      stopObserving(window, 'load', insertProgressbar);
    };

    const centerProgressbar = function() {
      const winsize = windowSize();
      let hide = false;
      if (progressbar.container.style.display === 'none') {
        hide = true;
        progressbar.container.style.visibility = 'hidden';
        progressbar.container.style.display = '';
      }
      const width = progressbar.container.offsetWidth;
      const height = progressbar.container.offsetHeight;
      const labelHeight = progressbar.label.offsetHeight;
      if (hide) {
        progressbar.container.style.display = 'none';
        progressbar.container.style.visibility = '';
      }
      progressbar.container.style.left =
        Math.round((winsize.width - width) * 0.5) + 'px';
      progressbar.container.style.top =
        Math.round((winsize.height - height) * 0.5) + 'px';
      progressbar.label.style.top =
        Math.round((height - labelHeight) * 0.5) + 'px';
    };

    onprogress((loaded, total) => {
      if (this.showLoadProgress || progressbar) {
        if (!progressbar) {
          progressbar = {
            bar: tag('div', {
              style: {
                margin: '0',
                padding: '0',
                borderStyle: 'none',
                width: '0',
                height: '100%',
                background: '#9BD6F4',
                MozBorderRadius: '5px',
                borderRadius: '5px'
              },
              id: 'pc_m_bar'
            }),
            label: tag('div', {
              style: {
                position: 'absolute',
                margin: '0',
                padding: '0',
                borderStyle: 'none',
                top: '0px',
                left: '0px',
                width: '100%',
                textAlign: 'center'
              },
              id: 'pc_m_label'
            })
          };
          progressbar.barcontainer = tag(
            'div',
            {
              style: {
                margin: '0',
                padding: '0',
                borderStyle: 'none',
                width: '100%',
                height: '100%',
                background: '#D8D8D8',
                MozBorderRadius: '5px',
                borderRadius: '5px'
              },
              id: 'pc_m_barcontainer'
            },
            progressbar.bar
          );
          progressbar.container = tag(
            'div',
            {
              style: {
                position: 'fixed',
                width: '450px',
                height: '30px',
                background: 'white',
                padding: '10px',
                margin: '0',
                MozBorderRadius: '5px',
                borderRadius: '5px',
                color: '#294256',
                fontWeight: 'bold',
                fontSize: '16px',
                opacity: '0.9',
                display: 'none',
                boxShadow: '2px 2px 12px rgba(0,0,0,0.4)',
                MozBoxShadow: '2px 2px 12px rgba(0,0,0,0.4)'
              },
              id: 'pc_m_container',
              onclick() {
                if (progressbar) {
                  progressbar.container.style.display = 'none';
                }
              }
            },
            progressbar.barcontainer,
            progressbar.label
          );
        }

        progressbar.finished = loaded === total;

        const progress = total === 0 ? 1.0 : loaded / total;
        progressbar.bar.style.width = Math.round(progress * 450) + 'px';
        progressbar.label.innerHTML = `Loading Ponies... ${Math.floor(
          progress * 100
        )}%`;

        if (!progressbar.container.parentNode) {
          if (document.body) {
            insertProgressbar();
          } else {
            observe(window, 'load', insertProgressbar);
          }
        }

        if (progressbar.finished) {
          setTimeout(function() {
            stopObserving(window, 'resize', centerProgressbar);
            stopObserving(window, 'load', insertProgressbar);
            if (
              progressbar &&
              progressbar.container &&
              progressbar.container.parentNode
            ) {
              progressbar.container.parentNode.removeChild(
                progressbar.container
              );
            }
            progressbar = null;
          }, 500);
        }
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
      if (what.at + this.fadeDuration <= currentTime) {
        if (what.element.parentNode) {
          what.element.parentNode.removeChild(what.element);
        }
      } else if (what.at <= currentTime) {
        setOpacity(
          what.element,
          1 - (currentTime - what.at) / this.fadeDuration
        );
      }
      return what.at + this.fadeDuration > currentTime;
    });

    if (this.showFps) {
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
      Math.max(this.interval - (currentTime - Date.now()), 0)
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
      const image: HTMLImageElement = (loader.object = new Image());
      observe(image, 'load', partial(observer, true));
      observe(image, 'error', partial(observer, false));
      observe(image, 'abort', partial(observer, false));
      image.src = imageUrl;
    };
    this.preload(loadImage, url, callback);
  }
}

const singletonGlobalState = new GlobalState();

export default singletonGlobalState;
