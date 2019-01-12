import { Pos, Rect, Size } from './types';

export const partial = function(fn, ...args) {
  return () => fn.apply(this, args);
};

export const observe = function(element: EventTarget, event, handler) {
  element.addEventListener(event, handler, false);
};
export const stopObserving = function(element: EventTarget, event, handler) {
  element.removeEventListener(event, handler, false);
};

export const setOpacity = function(element, opacity) {
  element.style.opacity = opacity;
};

export const tag = function(name: string, attributes, ...children): HTMLElement {
  const element = document.createElement(name);

  for (const attr in attributes) {
    if (attributes.hasOwnProperty(attr)) {
      const value = attributes[attr];
      if (attr === 'class' || attr === 'className') {
        element.className = String(value);
      } else if (element instanceof HTMLLabelElement && (attr === 'for' || attr === 'htmlFor')) {
        element.htmlFor = String(value);
      } else if (/^on/.test(attr)) {
        if (typeof value !== 'function') {
          throw new Error('Event listeners must be a function.');
        }
        observe(element, attr.replace(/^on/, ''), value);
      } else if (attr === 'style') {
        if (typeof value === 'object') {
          for (const cssProp in value) {
            if (value.hasOwnProperty(cssProp)) {
              const cssValue = value[cssProp];
              if (cssProp === 'float') {
                element.style.cssFloat = cssValue;
              } else if (cssProp === 'opacity') {
                setOpacity(element, Number(cssValue));
              } else {
                try {
                  element.style[cssProp] = cssValue;
                } catch (e) {
                  console.error(cssProp + '=' + cssValue + ' ' + e.toString());
                }
              }
            }
          }
        } else {
          element.style.cssText += ';' + value;
        }
      } else if (attr === 'value' && element instanceof HTMLTextAreaElement) {
        element.value = value;
      } else if (value === true) {
        element.setAttribute(attr, attr);
      } else if (value === false) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, String(value));
      }
    }
  }

  const addChild = function(chl) {
    if (typeof chl === 'string') {
      element.appendChild(document.createTextNode(chl));
    } else {
      element.appendChild(chl);
    }
  };

  children.forEach((child) => addChild(child));

  return element;
};

export const parseBoolean = function(value) {
  const s = value.trim().toLowerCase();
  if (s === 'true') {
    return true;
  } else if (s === 'false') {
    return false;
  } else {
    throw new Error('illegal boolean value: ' + value);
  }
};

export const distance = function(p1: Pos, p2: Pos): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const windowSize = (): Size => ({
  width: window.innerWidth,
  height: window.innerHeight
});

export const clipToScreen = function(rect: Rect): Pos {
  const winsize = windowSize();
  let x = rect.x;
  let y = rect.y;
  const wh = rect.width * 0.5;
  const hh = rect.height * 0.5;

  if (x < wh) {
    x = wh;
  } else if (x + wh > winsize.width) {
    x = winsize.width - wh;
  }

  if (y < hh) {
    y = hh;
  } else if (y + hh > winsize.height) {
    y = winsize.height - hh;
  }

  return { x: Math.round(x), y: Math.round(y) };
};

export const createAudio = function(urls: string | string[]) {
  const audio = new Audio();

  if (typeof urls === 'string') {
    audio.src = urls;
  } else {
    for (const url of urls) {
      const source: HTMLElement = tag('source', { src: url, type: `audio/${url.match(/\.(\w+$)/)[1] || 'unknown'}`});
      audio.appendChild(source);
    }
  }

  return audio;
};

export const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];
