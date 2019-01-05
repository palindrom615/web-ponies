import BrowserPonies from '../src';
import BrowserPoniesConfig from './ponycfg.json';
import { observe, tag, partial } from '../src/utils';

let add = function(element, arg) {
  if (!arg) return;
  if (typeof arg === 'string') {
    element.appendChild(document.createTextNode(arg));
  } else if (Array.isArray(arg)) {
    for (let i = 0, n = arg.length; i < n; ++i) {
      add(element, arg[i]);
    }
  } else if (arg.nodeType === 1 || arg.nodeType === 3) {
    element.appendChild(arg);
  } else {
    for (let attr in arg) {
      let value = arg[attr];
      if (attr === 'class' || attr === 'className') {
        element.className = String(value);
      } else if (attr === 'for' || attr === 'htmlFor') {
        element.htmlFor = String(value);
      } else if (/^on/.test(attr)) {
        if (typeof value !== 'function') {
          throw new Error('Event listeners must be a function.');
        }
        observe(element, attr.replace(/^on/, ''), value);
      } else if (attr === 'style') {
        if (typeof value === 'object') {
          for (let name in value) {
            let cssValue = value[name];
            if (name === 'float') {
              element.style.cssFloat = cssValue;
              element.style.styleFloat = cssValue;
            } else if (name === 'opacity') {
              setOpacity(element, Number(cssValue));
            } else {
              try {
                element.style[name] = cssValue;
              } catch (e) {
                console.error(name + '=' + cssValue + ' ' + e.toString());
              }
            }
          }
        } else {
          element.style.cssText += ';' + value;
        }
      } else if (attr === 'value' && element.nodeName === 'TEXTAREA') {
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
};

let dataUrl = function(mimeType, data) {
  return 'data:' + mimeType + ';base64,' + Base64.encode(data);
};
// inspired by:
// http://farhadi.ir/posts/utf8-in-javascript-with-a-new-trick
let Base64 = {
  encode: function(input) {
    return btoa(unescape(encodeURIComponent(input)));
  },
  decode: function(input) {
    return decodeURIComponent(escape(atob(input)));
  }
};

let $ = function(id) {
  return document.getElementById(id);
};
function absUrl(url) {
  return window.location.href;
}

window.$x = function(xpath, context) {
  let nodes = [];
  try {
    let doc = (context && context.ownerDocument) || document;
    let results = doc.evaluate(
      xpath,
      context || doc,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    let node;
    while ((node = results.iterateNext())) nodes.push(node);
  } catch (e) {
    console.error(e);
  }
  return nodes;
};
let $x = window.$x;

function init() {
  setNumberFieldValue($('volume'), Math.round(BrowserPonies.getVolume() * 100));
  setNumberFieldValue($('fade'), BrowserPonies.getFadeDuration() / 1000);
  setNumberFieldValue($('fps'), BrowserPonies.getFps());
  setNumberFieldValue(
    $('speak'),
    Math.round(BrowserPonies.getSpeakProbability() * 100)
  );
  setNumberFieldValue($('speed'), BrowserPonies.getSpeed());
  $('progressbar').checked = BrowserPonies.isShowLoadProgress();
  $('enableaudio').checked = BrowserPonies.isAudioEnabled();
  $('dontspeak').checked = BrowserPonies.isDontSpeak();
  $('showfps').checked = BrowserPonies.isShowFps();

  let list = $('ponylist');
  let ponies = BrowserPonies.ponies();
  let names = [];

  for (let name in ponies) {
    names.push(name);
  }
  names.sort();

  let categorymap = {};

  // find all categories:
  for (let i = 0, n = names.length; i < n; ++i) {
    let pony = ponies[names[i]];
    for (let j = 0, m = pony.categories.length; j < m; ++j) {
      categorymap[pony.categories[j]] = true;
    }
  }
  let categories = [];
  for (let name in categorymap) {
    categories.push(name);
  }
  categories.sort();

  // build pony list:
  list.appendChild(
    render('Random Pony', 'ponies/Random%20Pony/random-pony.gif', 0, categories)
  );
  for (let i = 0, n = names.length; i < n; ++i) {
    let pony = ponies[names[i]];
    list.appendChild(
      render(
        pony.name,
        pony.all_behaviors[0].rightimage,
        pony.instances.length,
        pony.categories
      )
    );
  }

  // build pony filter:
  let catselect = $('catselect');
  let catlist = $('catlist');

  for (let name of categories) {
    let pretty = titelize(name);
    catselect.appendChild(
      tag(
        'li',
        {
          style: 'display:none;',
          onclick: partial(changeCategory, name, true),
          'data-category': name
        },
        pretty
      )
    );
    catlist.appendChild(
      tag(
        'li',
        { 'data-category': name },
        pretty,
        ' ',
        tag(
          'span',
          {
            class: 'delcat',
            onclick: partial(changeCategory, name, false)
          },
          '\u00d7'
        )
      )
    );
  }
}

observe(window, 'click', function(event) {
  let target = event.target || event.srcElement;
  if (target.id !== 'addcat') {
    $('catselect').style.display = 'none';
  }
});

function items(list) {
  let node = list.firstChild;
  let items = [];
  while (node) {
    if (node.nodeName === 'LI') {
      items.push(node);
    }
    node = node.nextSibling;
  }
  return items;
}

function showCategorySelect() {
  let addcat = $('addcat');
  let catselect = $('catselect');
  catselect.style.top = addcat.offsetTop + addcat.offsetHeight + 'px';
  catselect.style.left = addcat.offsetLeft + 'px';
  catselect.style.display = '';
}

function changeCategory(category, add) {
  let categories = {};
  let catselect = $('catselect');
  let catlist = $('catlist');

  let selectors = items(catselect);
  for (let i = 0, n = selectors.length; i < n; ++i) {
    let selector = selectors[i];
    let name = selector.getAttribute('data-category');
    if (name === category) {
      selector.style.display = add ? 'none' : '';
      break;
    }
  }

  let catnodes = items(catlist);
  let all = true,
    no = true;
  for (let i = 0, n = catnodes.length; i < n; ++i) {
    let catnode = catnodes[i];
    let name = catnode.getAttribute('data-category');
    if (name === category) {
      catnode.style.display = add ? '' : 'none';
    }
    if (catnode.style.display === 'none') {
      all = false;
    } else {
      no = false;
      categories[name] = true;
    }
  }

  $('allcatsadded').style.display = all ? '' : 'none';
  $('nocatadded').style.display = no ? '' : 'none';

  filterPonies(categories);
}

function removeAllCategories() {
  let catselect = $('catselect');
  let catlist = $('catlist');

  let selectors = items(catselect);
  for (let i = 0, n = selectors.length; i < n; ++i) {
    selectors[i].style.display = '';
  }

  let catnodes = items(catlist);
  for (let i = 0, n = catnodes.length; i < n; ++i) {
    catnodes[i].style.display = 'none';
  }

  $('allcatsadded').style.display = 'none';
  $('nocatadded').style.display = '';

  filterPonies({});
}

function filterPonies(catmap) {
  let ponies = items($('ponylist'));

  for (let i = 0, n = ponies.length; i < n; ++i) {
    let pony = ponies[i];
    let categories = pony.getAttribute('data-categories').split(',');
    let matches = false;
    for (let j = 0, m = categories.length; j < m; ++j) {
      let category = categories[j].trim();
      if (catmap.hasOwnProperty(category)) {
        matches = true;
        break;
      }
    }
    pony.style.display = matches ? '' : 'none';
  }
}

function titelize(s) {
  let buf = [];
  while (s.length > 0) {
    let i = s.search(/[^0-9a-z]/i);
    if (i < 0) {
      i = s.length;
    }
    let word = s.slice(0, i);
    buf.push(word.slice(0, 1).toUpperCase());
    buf.push(word.slice(1).toLowerCase());
    buf.push(s.slice(i, i + 1));
    s = s.slice(i + 1);
  }
  return buf.join('');
}

function getNumberFieldValue(field) {
  let value = field.getAttribute('data-value');
  if (value === null) {
    let decimals = field.getAttribute('data-decimals');

    value = parseFloat(field.value);
    if (decimals !== null) {
      value = parseFloat(value.toFixed(parseInt(decimals)));
    }
  } else {
    value = parseFloat(value);
  }
  return value;
}

function setNumberFieldValue(field, value) {
  if (!isNaN(value)) {
    value = parseFloat(value);
    let min = field.getAttribute('data-min');
    let max = field.getAttribute('data-max');
    let decimals = field.getAttribute('data-decimals');
    if (min !== null) {
      value = Math.max(parseFloat(min), value);
    }
    if (max !== null) {
      value = Math.min(parseFloat(max), value);
    }
    if (decimals !== null) {
      value = value.toFixed(parseInt(decimals));
    } else {
      value = String(value);
    }

    field.value = value;
    field.setAttribute('data-value', value);
  }
}

function numberFieldChanged() {
  if (isNaN(this.value)) {
    this.value =
      this.getAttribute('data-value') || this.getAttribute('data-min') || '0';
  } else {
    setNumberFieldValue(this, this.value);
  }
  updateConfig();
}

function increaseNumberField() {
  let step = this.getAttribute('data-step');
  if (step === null) {
    step = 1;
  } else {
    step = parseFloat(step);
  }
  setNumberFieldValue(this, getNumberFieldValue(this) + step);
  updateConfig();
}

function decreaseNumberField() {
  let step = this.getAttribute('data-step');
  if (step === null) {
    step = 1;
  } else {
    step = parseFloat(step);
  }
  setNumberFieldValue(this, getNumberFieldValue(this) - step);
  updateConfig();
}

function ponyCountId(name) {
  return 'pony_' + name.toLowerCase().replace(/[^a-z0-9]/gi, '_') + '_count';
}

function render(name, image, count, categories) {
  let input_id = ponyCountId(name);
  let input = tag('input', {
    type: 'text',
    class: 'number',
    name: 'count',
    value: count,
    'data-value': count,
    'data-min': 0,
    'data-decimals': 0,
    'data-pony': name,
    id: input_id,
    size: 3,
    onchange: numberFieldChanged
  });

  return tag(
    'li',
    { 'data-categories': categories.join(', ') },
    tag('div', { class: 'ponyname' }, name.replace(/_/g, ' ')),
    tag('div', { class: 'ponyimg' }, tag('img', { src: image })),
    tag('label', { for: input_id }, 'Count: '),
    input,
    tag(
      'button',
      { class: 'increase', onclick: increaseNumberField.bind(input) },
      '+'
    ),
    tag(
      'button',
      { class: 'decrease', onclick: decreaseNumberField.bind(input) },
      '\u2013'
    )
  );
}

function ponyCountFields() {
  return $x('//input[@name="count"]', $('ponylist'));
}

function setAllZero() {
  let inputs = ponyCountFields();
  for (let i = 0, n = inputs.length; i < n; ++i) {
    setNumberFieldValue(inputs[i], 0);
  }
  updateConfig();
}

function dumpConfig(dontSkip) {
  let config = { baseurl: absUrl('') };

  config.fadeDuration = getNumberFieldValue($('fade')) * 1000;
  config.volume = getNumberFieldValue($('volume')) / 100;
  config.fps = getNumberFieldValue($('fps'));
  config.speed = getNumberFieldValue($('speed'));
  config.audioEnabled = $('enableaudio').checked;
  if ($('dontspeak').checked) config.dontSpeak = true;
  config.showFps = $('showfps').checked;
  config.showLoadProgress = $('progressbar').checked;
  config.speakProbability = getNumberFieldValue($('speak')) / 100;
  config.spawn = {};

  let inputs = ponyCountFields();
  inputs.forEach(input => {
    let value = getNumberFieldValue(input);
    if (!dontSkip && value <= 0) return;
    let name = input.getAttribute('data-pony');
    if (name === 'Random Pony') {
      config.spawnRandom = value;
    } else {
      config.spawn[name.toLowerCase()] = value;
    }
  });
  return config;
}

function updateDontSpeak(checked) {
  let speak = $('speak');
  let tr = speak.parentNode.parentNode;
  tr.className = checked ? 'disabled' : '';
  speak.disabled = checked;
  let buttons = tr.getElementsByTagName('button');
  for (let i = 0; i < buttons.length; ++i) {
    buttons[i].disabled = checked;
  }

  updateConfig();
}

export {
  $,
  init,
  showCategorySelect,
  removeAllCategories,
  numberFieldChanged,
  increaseNumberField,
  decreaseNumberField,
  setAllZero,
  updateDontSpeak
};

// gui.js
import './css/gui.css';

// just so that the bookmarklet also works here:
let BrowserPoniesBaseConfig = {};

let oldConfig = {};
let PonyScripts = {
  'browser-ponies-script': absUrl('js/browserponies.js'),
  'browser-ponies-config': absUrl('js/basecfg.js')
};

function toggleBrowserPoniesToBackground() {
  let main = $('main');
  if (main.style.zIndex === '') {
    main.style.zIndex = '100000000';
  } else {
    main.style.zIndex = '';
  }
}

function ponyCode(config) {
  let code = '(' + starter.toString() + ')(';
  if (typeof JSON === 'undefined') {
    code += '{},{});';
  } else {
    code += JSON.stringify(PonyScripts) + ',' + JSON.stringify(config) + ');';
  }
  return code
    .replace(/^\s*\/\/.*\n/gm, ' ')
    .replace(/^\s*\n/gm, ' ')
    .replace(/\s\s+/g, ' ');
}

function embedCode(config) {
  let copy = {};
  for (let key in config) {
    copy[key] = config[key];
  }
  copy.autostart = true;
  return (
    '<script type="text/javascript" src="' +
    PonyScripts['browser-ponies-config'] +
    '" id="browser-ponies-config"></script>' +
    '<script type="text/javascript" src="' +
    PonyScripts['browser-ponies-script'] +
    '" id="browser-ponies-script"></script>' +
    '<script type="text/javascript">/* <![CDATA[ */ ' +
    '(function (cfg) {' +
    'BrowserPonies.setBaseUrl(cfg.baseurl);' +
    'BrowserPonies.loadConfig(BrowserPoniesBaseConfig);' +
    'BrowserPonies.loadConfig(cfg);' +
    '})(' +
    JSON.stringify(copy).replace(/\]\]/g, ']"+"]') +
    '); /* ]]> */</script>'
  );
}

function updateConfig() {
  let config = dumpConfig();
  let code = ponyCode(config);

  $('bookmarklet').href = 'javascript:' + code + 'void(0)';
  $('embedcode').value = embedCode(config);

  let baseurl = config.baseurl;
  delete config.paddock;
  delete config.grass;

  BrowserPonies.setVolume(config.volume);
  BrowserPonies.setFadeDuration(config.fadeDuration);
  BrowserPonies.setFps(config.fps);
  BrowserPonies.setSpeed(config.speed);
  BrowserPonies.setAudioEnabled(config.audioEnabled);
  BrowserPonies.setShowFps(config.showFps);
  BrowserPonies.setShowLoadProgress(config.showLoadProgress);
  BrowserPonies.setSpeakProbability(config.speakProbability);
  BrowserPonies.setDontSpeak(config.dontSpeak);

  let random = config.spawnRandom || 0;
  let ponies = BrowserPonies.ponies();
  for (let name in ponies) {
    let pony = ponies[name];
    let count = config.spawn[name] || 0;
    let diff = count - pony.instances.length;

    if (diff > 0) {
      BrowserPonies.spawn(name, diff);
    } else if (random > -diff) {
      random += diff;
    } else {
      BrowserPonies.unspawn(name, -diff - random);
      random = 0;
    }
  }
  BrowserPonies.spawnRandom(random);

  delete config.spawn;
  delete config.spawnRandom;

  let changed = false;
  for (let name in config) {
    if (oldConfig[name] !== config[name]) {
      changed = true;
      break;
    }
  }

  if (changed) {
    config.baseurl = baseurl;
    $('bookmarks').href = dataUrl('text/html', bookmarksMenu(config));
    oldConfig = config;
  }
}

let starter = function(srcs, cfg) {
  let cbcount = 1;
  let callback = function() {
    --cbcount;
    if (cbcount === 0) {
      BrowserPonies.setBaseUrl(cfg.baseurl);
      if (!BrowserPoniesBaseConfig.loaded) {
        BrowserPonies.loadConfig(BrowserPoniesBaseConfig);
        BrowserPoniesBaseConfig.loaded = true;
      }
      BrowserPonies.loadConfig(cfg);
      if (!BrowserPonies.running()) BrowserPonies.start();
    }
  };

  if (typeof BrowserPoniesConfig === 'undefined') {
    window.BrowserPoniesConfig = {};
  }

  if (typeof BrowserPoniesBaseConfig === 'undefined') {
    ++cbcount;
    BrowserPoniesConfig.onbasecfg = callback;
  }

  if (typeof BrowserPonies === 'undefined') {
    ++cbcount;
    BrowserPoniesConfig.oninit = callback;
  }

  let node =
    document.body ||
    document.documentElement ||
    document.getElementsByTagName('head')[0];
  for (let id in srcs) {
    if (document.getElementById(id)) continue;
    if (node) {
      let s = document.createElement('script');
      s.type = 'text/javascript';
      s.id = id;
      s.src = srcs[id];
      node.appendChild(s);
    } else {
      document.write(
        '\u003cscript type="text/javscript" src="' +
        srcs[id] +
        '" id="' +
        id +
        '"\u003e\u003c/script\u003e'
      );
    }
  }

  callback();
};

function bookmarksMenu(config) {
  let currentTime = Date.now();
  let buf = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n' +
    '<!-- This is an automatically generated file.\n' +
    '     It will be read and overwritten.\n' +
    '     DO NOT EDIT! -->\n' +
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n' +
    '<TITLE>Bookmarks</TITLE>\n' +
    '<H1>Bookmarks</H1>\n' +
    '<DL><p>\n' +
    '\t<DT><H3 ADD_DATE="' +
    currentTime +
    '" LAST_MODIFIED="' +
    currentTime +
    '" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks Bar</H3>\n' +
    '\t<DL><p>\n' +
    '\t\t<DT><H3 ADD_DATE="' +
    currentTime +
    '" LAST_MODIFIED="' +
    currentTime +
    '">Ponies</H3>\n' +
    '\t\t<DL><p>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.start();void(0)" ADD_DATE="' +
    currentTime +
    '">\u25B6 Start</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.stop();void(0)" ADD_DATE="' +
    currentTime +
    '">\u25A0 Stop</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.pause();void(0)" ADD_DATE="' +
    currentTime +
    '">\u25AE\u25AE Pause</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.resume();void(0)" ADD_DATE="' +
    currentTime +
    '">\u25AE\u25B6 Resume</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.togglePoniesToBackground();void(0)" ADD_DATE="' +
    currentTime +
    '">\u2195 Toggle ponies in background</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.unspawnAll();BrowserPonies.stop();void(0)" ADD_DATE="' +
    currentTime +
    '">\u00d7 Remove all ponies</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.setAudioEnabled(false);void(0)" ADD_DATE="' +
    currentTime +
    '">Mute Audio</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.setAudioEnabled(true);void(0)" ADD_DATE="' +
    currentTime +
    '">Enable Audio</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.setVolume(Math.min(BrowserPonies.getVolume()%2B0.1,1));void(0)" ADD_DATE="' +
    currentTime +
    '">+ Increase Volume</A>\n' +
    '\t\t\t<DT><A HREF="javascript:BrowserPonies.setVolume(Math.max(BrowserPonies.getVolume()-0.1,0));void(0)" ADD_DATE="' +
    currentTime +
    '">\u2013 Decrease Volume</A>\n'
  ];

  delete config.spawn;
  config.spawnRandom = 1;
  buf.push(
    '\t\t\t<DT><A HREF="javascript:' +
    encodeURIComponent(ponyCode(config)) +
    'void(0)" ADD_DATE="' +
    currentTime +
    '">Random Pony</A>\n'
  );
  delete config.spawnRandom;

  let ponies = BrowserPonies.ponies();
  let names = [];

  for (let name in ponies) {
    names.push(name);
  }
  names.sort();

  for (let i = 0; i < names.length; ++i) {
    let name = names[i];
    let pony = ponies[name];
    config.spawn = {};
    config.spawn[name] = 1;
    buf.push(
      '\t\t\t<DT><A HREF="javascript:' +
      encodeURIComponent(ponyCode(config)) +
      'void(0)" ADD_DATE="' +
      currentTime +
      '">' +
      pony.name
        .replace(/_/g, ' ')
        .replace(/</g, '\u2039')
        .replace(/>/g, '\u203a')
        .replace(/&/g, '+') +
      '</A>\n'
    );
  }

  buf.push('\t\t</DL><p>\n' + '\t</DL><p>\n' + '</DL><p>\n');

  return buf.join('');
}

function dragoverHandler(supportedTypes) {
  return function(event) {
    let files = event.dataTransfer.files;
    let accept = false;

    if (!files || files.length === 0) {
      let types = event.dataTransfer.types;

      if (types) {
        for (let i = 0; i < types.length && !accept; ++i) {
          let type = types[i];
          for (let j = 0; j < supportedTypes.length; ++j) {
            let supportedType = supportedTypes[j];

            if (typeof supportedType === 'string') {
              if (supportedType === type) {
                accept = true;
                break;
              }
            } else if (supportedType.test(type)) {
              accept = true;
              break;
            }
          }
        }
      }
    } else {
      accept = true;
    }

    let dropzone = upOrSelfClass(event.target, 'dropzone');
    if (accept) {
      addClass(dropzone, 'dragover');
      event.dropEffect = 'copy';
      event.stopPropagation();
      event.preventDefault();
    } else {
      event.dropEffect = 'none';
    }

    dropzone.querySelector("input[type='file']").style.display = 'none';
  };
}

function addClass(e, className) {
  let clslist = (e.className || '').trim();
  let clss = {};

  if (clslist) {
    clslist = clslist.split(/\s+/g);
    for (let i = 0; i < clslist.length; ++i) {
      clss[clslist[i]] = true;
    }
  }
  clss[className] = true;

  clslist = [];
  for (let cls in clss) {
    clslist.push(cls);
  }
  e.className = clslist.join(' ');
}

function removeClass(e, className) {
  let clslist = (e.className || '').trim();
  let clss = {};

  if (clslist) {
    clslist = clslist.split(/\s+/g);
    for (let i = 0; i < clslist.length; ++i) {
      clss[clslist[i]] = true;
    }
  }
  delete clss[className];

  clslist = [];
  for (let cls in clss) {
    clslist.push(cls);
  }
  e.className = clslist.join(' ');
}

function hasClass(e, className) {
  let clslist = (e.className || '').trim();

  if (clslist) {
    clslist = clslist.split(/\s+/g);
    for (let i = 0; i < clslist.length; ++i) {
      if (clslist[i] === className) {
        return true;
      }
    }
  }

  return false;
}

function mousemoveDropzone(event) {
  let input = this.querySelector("input[type='file']");
  let rect = this.getBoundingClientRect();
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;

  input.style.left = Math.round(x - input.offsetWidth + 5) + 'px';
  input.style.top = Math.round(y - input.offsetHeight * 0.5) + 'px';
}

function dragleaveDropzone(event) {
  let dropzone = upOrSelfClass(event.target, 'dropzone');
  removeClass(dropzone, 'dragover');
  let input = dropzone.querySelector("input[type='file']");
  if (input) input.style.display = '';
}

let dragoverPony = dragoverHandler(['text/plain', 'Text', 'Files']);
let dragoverFile = dragoverHandler([
  'text/plain',
  'Text',
  /^image\//,
  /^audio\//,
  'text/uri-list',
  'Files'
]);
let dragoverImage = dragoverHandler([
  'text/plain',
  'Text',
  /^image\//,
  'text/uri-list',
  'Files'
]);
let dragoverAudio = dragoverHandler([
  'text/plain',
  'Text',
  /^audio\//,
  'text/uri-list',
  'Files'
]);
let dragoverInteractions = dragoverPony;

function dropInteractions(event) {
  let dropzone = upOrSelfClass(event.target, 'dropzone');
  removeClass(dropzone, 'dragover');
  event.stopPropagation();
  event.preventDefault();

  let transfer = event.dataTransfer;
  let files = transfer.files;

  if (files && files.length > 0) {
    loadInteractionFiles(files);
  } else {
    let text = transfer.getData('text/plain') || transfer.getData('Text');
    loadInteraction(text, '(dropped text)');
  }
  dropzone.querySelector("input[type='file']").style.display = '';
}

function dropPony(event) {
  let dropzone = upOrSelfClass(event.target, 'dropzone');
  removeClass(dropzone, 'dragover');
  event.stopPropagation();
  event.preventDefault();

  let transfer = event.dataTransfer;
  let files = transfer.files;

  if (files && files.length > 0) {
    loadPonyFiles(files);
  } else {
    let text = transfer.getData('text/plain') || transfer.getData('Text');
    loadPony(text, '(dropped text)');
  }
  dropzone.querySelector("input[type='file']").style.display = '';
}

function dropFile(event) {
  let dropzone = upOrSelfClass(event.target, 'dropzone');
  removeClass(dropzone, 'dragover');
  event.stopPropagation();
  event.preventDefault();

  let transfer = event.dataTransfer;
  let files = transfer.files;

  let pony = upOrSelfClass(dropzone, 'pony');
  if (files && files.length > 0) {
    loadFiles(files, pony);
  } else {
    changeFileUrls(getUrls(transfer), pony);
  }
  dropzone.querySelector("input[type='file']").style.display = '';
}

function dropSingleFile(event) {
  let dropzone = upOrSelfClass(event.target, 'dropzone');
  removeClass(dropzone, 'dragover');
  event.stopPropagation();
  event.preventDefault();

  let transfer = event.dataTransfer;
  let files = transfer.files;

  let action = upOrSelfClass(dropzone, 'pony').querySelector(
    'select.file-action'
  ).value;
  let file = upOrSelfClass(dropzone, 'file');
  if (files && files.length > 0) {
    loadFile(files[0], file, action);
  } else {
    let urls = getUrls(transfer);
    if (urls.length > 0) {
      file.querySelector('input.url').value = getUrls(transfer)[0];
    }
  }

  let input = dropzone.querySelector("input[type='file']");
  if (input) input.style.display = '';
}

function getUrls(transfer) {
  let urls =
    transfer.getData('Text') ||
    transfer.getData('text/plain') ||
    transfer.getData('text/uri-list') ||
    '';
  urls = urls.trim().split('\n');
  let filtered = [];
  for (let i = 0; i < urls.length; ++i) {
    let url = urls[i].trim();
    if (url) filtered.push(url);
  }
  return urls;
}

function fileReaderError(file, event) {
  if (file.name) {
    alert('Error reading file: ' + file.name);
  } else {
    alert('Error reading file.');
  }
  console.error(event);
}

function loadNamedResult(load, name) {
  return function(event) {
    load(event.target.result, name);
  };
}

function loadPonyFiles(files) {
  for (let i = 0; i < files.length; ++i) {
    let file = files[i];
    let reader = new FileReader();
    reader.onload = loadNamedResult(loadPony, file.name);
    reader.onerror = fileReaderError(file);
    reader.readAsText(file);
  }
}

function loadInteractionFiles(files) {
  for (let i = 0; i < files.length; ++i) {
    let file = files[i];
    let reader = new FileReader();
    reader.onload = loadNamedResult(loadInteraction, file.name);
    reader.onerror = fileReaderError(file);
    reader.readAsText(file);
  }
}

function upOrSelfTag(el, tagName) {
  tagName = tagName.toUpperCase();
  while (el && el.tagName !== tagName) {
    el = el.parentElement;
  }
  return el;
}

function upOrSelfClass(el, className) {
  while (el && !hasClass(el, className)) {
    el = el.parentElement;
  }
  return el;
}

function loadResultInto(input) {
  return function(event) {
    input.value = event.target.result;
  };
}

function resetFilenames(event) {
  let pony = upOrSelfClass(event.target, 'pony');
  let files = pony.querySelectorAll('.file[data-original-url]');
  for (let i = 0; i < files.length; ++i) {
    let file = files[i];
    let url = file.getAttribute('data-original-url');
    file.querySelector('input.url').value = url;
  }
}

function loadFiles(files, li) {
  let action = li.querySelector('select.file-action').value;
  let nomatch = [];
  for (let i = 0; i < files.length; ++i) {
    let file = files[i];
    let filename = decodeURIComponent(
      /^(?:.*[/\\])?([^/\\]*)$/.exec(file.name)[1]
    );
    let tr = li.querySelector(
      '.file[data-filename=' + JSON.stringify(filename.toLowerCase()) + ']'
    );
    if (tr) {
      loadFile(file, tr, action);
    } else {
      nomatch.push(file.name);
    }
  }

  if (nomatch.length > 0) {
    alert(
      'No match found for folowing files:\n \u2022 ' +
      nomatch.join('\n \u2022 ')
    );
  }
}

function loadFile(file, tr, action) {
  let input = tr.querySelector('input.url');
  if (action === 'embed') {
    let reader = new FileReader();
    reader.onerror = fileReaderError(file);
    reader.onload = loadResultInto(input);
    reader.readAsDataURL(file);
  } else {
    input.value = decodeURIComponent(
      /^(?:.*[/\\])?([^/\\]*)$/.exec(file.name)[1]
    );
  }
}

function changeFileUrls(urls, li) {
  let nomatch = [];
  for (let i = 0; i < urls.length; ++i) {
    let url = urls[i];
    let filename = decodeURIComponent(
      /^(?:.*[/\\])?([^/\\#?]*)(?:[?#].*)?$/.exec(url)[1]
    );
    let tr = li.querySelector(
      '.file[data-filename=' + JSON.stringify(filename.toLowerCase()) + ']'
    );
    if (tr) {
      tr.querySelector('input.url').value = url;
    } else {
      nomatch.push(url);
    }
  }

  if (nomatch.length > 0) {
    alert(
      'No match found for folowing URLs:\n \u2022 ' + nomatch.join('\n \u2022 ')
    );
  }
}

function fileChanged(event) {
  loadFiles(event.target.files, upOrSelfClass(event.target, 'pony'));
}

function singleFileChanged(event) {
  let action = upOrSelfClass(event.target, 'pony').querySelector(
    'select.file-action'
  ).value;
  loadFile(event.target.files[0], upOrSelfClass(event.target, 'file'), action);
}

function loadPony(text, name) {
  let pony_config_get = text.split('Interaction,')[0];
  let pony_interactions_get = text.replace(pony_config_get, '');
  let pony_name_get = text.split('\n')[0];
  text = text.replace(pony_interactions_get, '');
  let converinteractionscode = pony_interactions_get;
  let replace_interactions_code =
    converinteractionscode.split(',')[1] +
    ',"' +
    pony_name_get.replace('Name,', '') +
    '",';

  converinteractionscode = converinteractionscode
    .replace('Interaction,", "')
    .replace(
      converinteractionscode.split(',')[1] + ',',
      replace_interactions_code
    );
  if (
    pony_interactions_get != null &&
    pony_interactions_get != undefined &&
    pony_interactions_get != ''
  )
    loadInteraction(converinteractionscode, pony_name_get.replace('Name,', ''));
  let pony;
  try {
    pony = BrowserPonies.convertPony(text);
  } catch (e) {
    alert('Error parsing: ' + name);
    return;
  }
  let count = tag('input', {
    type: 'text',
    class: 'number count',
    value: 1,
    'data-value': 1,
    'data-min': 0,
    'data-decimals': 0,
    size: 3,
    onchange: numberFieldChanged
  });
  let remove = tag(
    'button',
    { class: 'remove', title: 'Remove Pony' },
    '\u00d7'
  );
  let tbody = tag('tbody');
  let input = tag('input', { type: 'file', multiple: 'multiple' });
  let dropzone = tag(
    'div',
    { class: 'dropzone' },
    'Click or drop image and sound files/URLs here.',
    input
  );
  let li = tag(
    'li',
    { class: 'pony', 'data-pony': JSON.stringify(pony) },
    tag('span', { class: 'name' }, pony.name),
    ' ',
    remove,
    tag(
      'div',
      tag('label', 'Count: ', count),
      tag(
        'button',
        { class: 'increase', onclick: increaseNumberField.bind(count) },
        '+'
      ),
      tag(
        'button',
        { class: 'decrease', onclick: decreaseNumberField.bind(count) },
        '\u2013'
      ),
      ' ',

      tag(
        'label',
        {
          title:
            'Common prefix of image/audio file URLs of this pony. (Not needed if you embed the files.)'
        },
        'Base URL: ',
        tag('input', {
          class: 'baseurl',
          type: 'text',
          value: pony.baseurl || ''
        })
      ),
      dropzone,
      tag(
        'label',
        'Action: ',
        tag(
          'select',
          { class: 'file-action' },
          tag(
            'option',
            {
              value: 'fix-names',
              title:
                'Only use the files to fix the case of the filenames. (The web is case sensitive.)'
            },
            'Fix Filenames'
          ),
          tag(
            'option',
            {
              value: 'embed',
              title:
                'Embed files directly in the generated script as data URLs. (Result will not work in Internet Explorer.)'
            },
            'Embed Files'
          )
        )
      ),
      tag('button', { onclick: resetFilenames }, 'Reset Filenames')
    ),
    tag(
      'table',
      { class: 'files' },
      tag(
        'thead',
        tag('tr', tag('th', 'Filename'), tag('th', 'URL'), tag('th', ''))
      ),
      tbody
    )
  );

  observe(remove, 'click', removeItem);
  observe(input, 'change', fileChanged);
  observe(dropzone, 'dragover', dragoverFile);
  observe(dropzone, 'dragenter', dragoverFile);
  observe(dropzone, 'dragleave', dragleaveDropzone);
  observe(dropzone, 'drop', dropFile);
  observe(dropzone, 'mousemove', mousemoveDropzone);

  let files = {};

  function addFilename(filename, what) {
    files[decodeURIComponent(filename || '').toLowerCase()] = what || 'file';
  }

  if (pony.behaviors) {
    for (let i = 0; i < pony.behaviors.length; ++i) {
      let behavior = pony.behaviors[i];
      addFilename(behavior.leftimage, 'image');
      addFilename(behavior.rightimage, 'image');

      if (behavior.effects) {
        for (let j = 0; j < behavior.effects.length; ++j) {
          let effect = behavior.effects[j];
          addFilename(effect.leftimage, 'image');
          addFilename(effect.rightimage, 'image');
        }
      }
    }
  }

  if (pony.speeches) {
    for (let i = 0; i < pony.speeches.length; ++i) {
      let speech = pony.speeches[i];
      if (speech.files) {
        for (let type in speech.files) {
          addFilename(speech.files[type], 'audio');
        }
      }
    }
  }

  let filenames = [];
  for (let filename in files) {
    filenames.push(filename);
  }
  filenames.sort();
  for (let i = 0; i < filenames.length; ++i) {
    let filename = filenames[i];
    let dropInput = tag('input', { type: 'file' });
    let url = encodeURIComponent(filename);
    let urlInput = tag('input', {
      class: 'url dropzone',
      type: 'text',
      value: url
    });
    let dropzone = tag(
      'div',
      {
        class: 'dropzone',
        title: 'Click or drop a single image or sound file/URL here.'
      },
      'Change...',
      dropInput
    );
    let tr = tag(
      'tr',
      { class: 'file', 'data-filename': filename, 'data-original-url': url },
      tag('td', { class: 'filename' }, filename),
      tag('td', urlInput),
      tag('td', dropzone)
    );

    if (files[filename] === 'audio') {
      observe(dropzone, 'dragover', dragoverAudio);
      observe(dropzone, 'dragenter', dragoverAudio);
    } else {
      observe(dropzone, 'dragover', dragoverImage);
      observe(dropzone, 'dragenter', dragoverImage);
    }

    observe(dropInput, 'change', singleFileChanged);
    observe(dropzone, 'dragleave', dragleaveDropzone);
    observe(dropzone, 'drop', dropSingleFile);
    observe(dropzone, 'mousemove', mousemoveDropzone);
    observe(urlInput, 'dragleave', dragleaveDropzone);
    observe(urlInput, 'drop', dropSingleFile);

    tbody.appendChild(tr);
  }

  $('own-ponies').appendChild(li);

  if (li.scrollIntoView) {
    li.scrollIntoView();
  }
}

function loadInteraction(text, name) {
  let interactions;
  try {
    interactions = BrowserPonies.convertInteractions(text);
  } catch (e) {
    alert('Error parsing: ' + name);
    return;
  }

  let remove = tag(
    'button',
    { class: 'remove', title: 'Remove Interaction' },
    '\u00d7'
  );
  let li = tag(
    'li',
    { class: 'interaction', 'data-interaction': JSON.stringify(interactions) },
    name,
    ' ',
    remove
  );

  observe(remove, 'click', removeItem);

  $('own-interactions').appendChild(li);

  if (li.scrollIntoView) {
    li.scrollIntoView();
  }
}

function removeItem(event) {
  let item = upOrSelfTag(event.target, 'li');
  item.parentNode.removeChild(item);
}

function inisToJS() {
  $('javascript-output').value = ownPoniesScript();
}

function ownPoniesScript() {
  let config = BrowserPonies.dumpConfig();

  delete config.spawnRandom;

  config.autostart = true;
  config.baseurl = $('own-baseurl').value.trim();
  if (!config.baseurl) delete config.baseurl;

  config.spawn = {};
  config.ponies = [];
  config.interactions = [];

  $('own-ponies')
    .querySelectorAll('li.pony')
    .forEach(elem => {
      let li = elem;
      let pony = JSON.parse(li.getAttribute('data-pony'));
      let filemap = {};

      let getUrl = function(filename) {
        return filemap[decodeURIComponent(filename || '').toLowerCase()];
      };

      config.spawn[pony.name] = getNumberFieldValue(
        li.querySelector('input.count')
      );
      pony.baseurl = li.querySelector('input.baseurl').value.trim();
      if (!pony.baseurl) delete pony.baseurl;

      let files = li.querySelectorAll('.file');
      for (let j = 0; j < files.length; ++j) {
        let file = files[j];
        let filename = file.getAttribute('data-filename');
        let url = file.querySelector('input.url').value.trim();
        filemap[filename] = url;
      }

      if (pony.behaviors) {
        for (let j = 0; j < pony.behaviors.length; ++j) {
          let behavior = pony.behaviors[j];
          behavior.leftimage = getUrl(behavior.leftimage);
          behavior.rightimage = getUrl(behavior.rightimage);

          if (behavior.effects) {
            for (let k = 0; k < behavior.effects.length; ++k) {
              let effect = behavior.effects[k];
              effect.leftimage = getUrl(effect.leftimage);
              effect.rightimage = getUrl(effect.rightimage);
            }
          }
        }
      }

      if (pony.speeches) {
        for (let j = 0; j < pony.speeches.length; ++j) {
          let speech = pony.speeches[j];
          if (speech.files) {
            let speechfiles = {};
            for (let type in speech.files) {
              speechfiles[type] = getUrl(speech.files[type]);
            }
            speech.files = speechfiles;
          }
        }
      }
      config.ponies.push(pony);
    });

  let items = $('own-interactions').querySelectorAll('li.interaction');
  for (let i = 0; i < items.length; ++i) {
    let li = items[i];
    config.interactions = config.interactions.concat(
      JSON.parse(li.getAttribute('data-interaction'))
    );
  }

  if (config.ponies.length === 0) {
    delete config.ponies;
    delete config.spawn;
  }
  if (config.interactions.length === 0) delete config.interactions;

  return 'BrowserPonies.loadConfig(' + JSON.stringify(config) + ');';
}

function initScriptUrl() {
  let url = $('javascript-url');
  url.innerHTML = '';
  add(url, PonyScripts['browser-ponies-script']);
}

export {
  updateConfig,
  mousemoveDropzone,
  dragleaveDropzone,
  dragoverPony,
  dragoverInteractions,
  dropInteractions,
  dropPony,
  loadPonyFiles,
  loadInteractionFiles,
  inisToJS,
  initScriptUrl,
  toggleBrowserPoniesToBackground
};
