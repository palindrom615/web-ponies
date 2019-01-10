import BrowserPoniesConfig from './ponycfg.json';
import BrowserPonies from '../src';
import poniesData from '../contents/ponies/ponies.ini.json';
import './css/gui.css';

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

import {
  init,
  removeAllCategories,
  setAllZero,
  updateDontSpeak,
  updateConfig
} from './gui';
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
    BrowserPonies.setAudioEnabled(e.target.checked);
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
    BrowserPonies.setSpeed(e.target.value);
  })
  document.getElementById('volume').addEventListener('change', (e) => {
    BrowserPonies.setVolume(e.target.value);
  })
  document.getElementById('fps').addEventListener('change', (e) => {
    BrowserPonies.setFps(e.target.value);
  })
  document.getElementById('speak').addEventListener('change', (e) => {
    BrowserPonies.setSpeakProbability(e.target.value);
  })
  document.getElementById('fade').addEventListener('change', (e) => {
    BrowserPonies.setFadeDuration(e.target.value);
  })
});

