import BrowserPoniesConfig from './ponycfg.json';
import { WebPonies } from '../src';
import { tag, observe, stopObserving } from '../src/utils';
import poniesData from '../contents/ponies/ponies.ini.json';
import './css/gui.css';

const BrowserPonies = new WebPonies();
export default BrowserPonies;
//for onclick use of browserponies in index.html
window.BrowserPonies = BrowserPonies;

BrowserPonies.loadConfig(BrowserPoniesConfig, poniesData);
if (BrowserPoniesConfig.oninit) {
  if (Array.isArray(BrowserPoniesConfig.oninit)) {
    for (var i = 0, n = BrowserPoniesConfig.oninit.length; i < n; ++i) {
      BrowserPoniesConfig.oninit[i]();
    }
  } else {
    BrowserPoniesConfig.oninit();
  }
}

const $ = function (id) {
  return document.getElementById(id);
};

function absUrl(url) {
  return window.location.href;
}

window.$x = function (xpath, context) {
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

const selectedCategory = new Set();
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

const removeAllCategories = () => {
  selectedCategory.clear();
  filterPonies();
}

function filterPonies() {
  let ponies = items($('ponylist'));

  for (const pony of ponies) {
    let categories = pony.getAttribute('data-categories').split(',');
    let matches = false;
    for (let j = 0, m = categories.length; j < m; ++j) {
      let category = categories[j].trim();
      if (selectedCategory.has(category)) {
        matches = true;
        break;
      }
    }
    pony.style.display = matches ? '' : 'none';
  }
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

const numberFieldChanged = (e) => {
  setNumberFieldValue(e.target, e.target.value);
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
    type: 'number',
    class: 'form-control',
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
    {
      'data-categories': categories.join(', '),
      className: 'list-group-item'
    },
    tag('div', { class: 'ponyname' }, name.replace(/_/g, ' ')),
    tag('div', { class: 'ponyimg' }, tag('img', { src: image })),
    tag('label', { for: input_id }, 'Count: '),
    input
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

let oldConfig = {};

function toggleBrowserPoniesToBackground() {
  let main = $('main');
  if (main.style.zIndex === '') {
    main.style.zIndex = '100000000';
  } else {
    main.style.zIndex = '';
  }
}
const init = () => {
  $('volume').value = Math.round(BrowserPonies.config.volume * 100);
  $('fade').value = BrowserPonies.config.fadeDuration / 1000
  $('fps').value = BrowserPonies.fps;

  $('speak').value = Math.round(BrowserPonies.config.speakProbability * 100)
  $('speed').value = BrowserPonies.config.speed;
  $('progressbar').checked = BrowserPonies.config.showLoadProgress;
  $('enableaudio').checked = BrowserPonies.config.audioEnabled;
  $('dontspeak').checked = BrowserPonies.config.dontSpeak;
  $('showfps').checked = BrowserPonies.config.showFps;

  let list = $('ponylist');
  let ponies = BrowserPonies.ponies;
  let names = Array.from(ponies.keys());

  names.sort();

  // find all categories:
  const categorySet = new Set();
  for (const name of names) {
    let pony = ponies.get(name);
    categorySet.add(...pony.categories);
  }
  categorySet.delete(undefined)
  let categories = Array.from(categorySet.values());
  categories.sort();
  categories.forEach(cat => {
    selectedCategory.add(cat);
  });

  // build pony list:
  list.appendChild(
    render('Random Pony', 'ponies/Random%20Pony/random-pony.gif', 0, categories)
  );
  for (const name of names) {
    let pony = ponies.get(name);
    list.appendChild(
      render(
        pony.name,
        pony.behaviors[0].rightimage,
        pony.instances.length,
        pony.categories
      )
    );
  }

  // build pony filter:

  const categorySelect = $('category');
  categorySelect.innerHTML = categories.map((cat) => `
    <option value="${cat}">${cat}</option>
  `).join('');

  categorySelect.addEventListener('change', (e) => {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();

    selectedCategory.has(e.target.value) ?
      selectedCategory.delete(e.target.value) :
      selectedCategory.add(e.target.value)
    for (const option of e.target.children) {
      option.selected = selectedCategory.has(option.value);
    }
    filterPonies();
  })
}

function updateConfig() {
  let config = dumpConfig();

  BrowserPonies.config = {
    ...BrowserPonies.config,
    ...config
  }
  BrowserPonies.setShowFps(config.showFps);

  let random = config.spawnRandom || 0;
  let ponies = BrowserPonies.ponies;
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
}

document.addEventListener('DOMContentLoaded', function () {
  init();
  updateConfig();
  document.getElementById('removeallcateg').addEventListener('click', function () {
    removeAllCategories();
  });
  document.getElementById('setallzero').addEventListener('click', function () {
    setAllZero();
  });
  document.getElementById('enableaudio').addEventListener('change', function (e) {
    BrowserPonies.config.audioEnabled = e.target.checked;
  });
  document.getElementById('showfps').addEventListener('change', function () {
    updateConfig();
  });
  document.getElementById('progressbar').addEventListener('change', function () {
    updateConfig();
  });
  document.getElementById('dontspeak').addEventListener('change', function () {
    updateDontSpeak(this.checked);
  });
  document.getElementById('speed').addEventListener('change', (e) => {
    BrowserPonies.config.speed = e.target.value;
  })
  document.getElementById('volume').addEventListener('change', (e) => {
    BrowserPonies.config.volume = (e.target.value);
  })
  document.getElementById('fps').addEventListener('change', (e) => {
    BrowserPonies.fps = (e.target.value);
  })
  document.getElementById('speak').addEventListener('change', (e) => {
    BrowserPonies.config.speakProbability = (e.target.value);
  })
  document.getElementById('fade').addEventListener('change', (e) => {
    BrowserPonies.config.fadeDuration = (e.target.value);
  })
});

