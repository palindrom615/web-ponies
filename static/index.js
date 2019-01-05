import BrowserPoniesConfig from './ponycfg.json';
import BrowserPonies from '../src';
import poniesData from '../contents/ponies/ponies.ini.json';

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
  $,
  init,
  showCategorySelect,
  removeAllCategories,
  numberFieldChanged,
  increaseNumberField,
  decreaseNumberField,
  setAllZero,
  updateDontSpeak
} from './gui';
import {
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
  initScriptUrl
} from './gui';
jQuery('body').ready(function() {
  init();
  updateConfig();
  initScriptUrl();
  jQuery('#embedcode').click(function() {
    this.select();
  });
  jQuery('#btpx_5').click(function() {
    increaseNumberField.call($('speed'));
  });
  jQuery('#btpx_6').click(function() {
    decreaseNumberField.call($('speed'));
  });
  jQuery('#btpx_7').click(function() {
    increaseNumberField.call($('speak'));
  });
  jQuery('#btpx_8').click(function() {
    decreaseNumberField.call($('speak'));
  });
  jQuery('#btpx_9').click(function() {
    increaseNumberField.call($('volume'));
  });
  jQuery('#btpx_10').click(function() {
    decreaseNumberField.call($('volume'));
  });
  jQuery('#btpx_11').click(function() {
    increaseNumberField.call($('fps'));
  });
  jQuery('#btpx_12').click(function() {
    decreaseNumberField.call($('fps'));
  });
  jQuery('#btpx_13').click(function() {
    increaseNumberField.call($('fade'));
  });
  jQuery('#btpx_14').click(function() {
    decreaseNumberField.call($('fade'));
  });
  jQuery('#addcat').click(function() {
    showCategorySelect();
  });
  jQuery('#removeallcateg').click(function() {
    removeAllCategories();
  });
  jQuery('#setallzero').click(function() {
    setAllZero();
  });
  jQuery('#inistojs').click(function() {
    inisToJS();
  });
  jQuery('#paddock').change(function() {
    updateConfig();
  });
  jQuery('#grass').change(function() {
    updateConfig();
  });
  jQuery('#enableaudio').change(function() {
    updateConfig();
  });
  jQuery('#showfps').change(function() {
    updateConfig();
  });
  jQuery('#progressbar').change(function() {
    updateConfig();
  });
  jQuery('#dontspeak').change(function() {
    updateDontSpeak(this.checked);
  });
  jQuery('#speed').change(function() {
    numberFieldChanged.call(this, event);
  });
  jQuery('#speak').change(function() {
    numberFieldChanged.call(this, event);
  });
  jQuery('#volume').change(function() {
    numberFieldChanged.call(this, event);
  });
  jQuery('#fps').change(function() {
    numberFieldChanged.call(this, event);
  });
  jQuery('#fade').change(function() {
    numberFieldChanged.call(this, event);
  });
  jQuery('#fileloadponies').change(function() {
    loadPonyFiles(this.files);
  });
  jQuery('#fileloadinteractions').change(function() {
    loadInteractionFiles(this.files);
  });
  jQuery('#dropzoneponies')
    .on('drop', function() {
      dropPony.call(this, event);
    })
    .on('dragover', function() {
      dragoverPony.call(this, event);
    })
    .on('dragenter', function() {
      dragoverPony.call(this, event);
    })
    .on('dragleave', function() {
      dragleaveDropzone.call(this, event);
    })
    .on('mousemove', function() {
      mousemoveDropzone.call(this, event);
    });
  jQuery('#dropzoneinteractions')
    .on('drop', function() {
      dropInteractions.call(this, event);
    })
    .on('dragover', function() {
      dragoverInteractions.call(this, event);
    })
    .on('dragenter', function() {
      dragoverInteractions.call(this, event);
    })
    .on('dragleave', function() {
      dragleaveDropzone.call(this, event);
    })
    .on('mousemove', function() {
      mousemoveDropzone.call(this, event);
    });
});
jQuery('body').append(
  jQuery('<div>', {
    id: 'scrollup',
    class: 'glyphicon glyphicon-arrow-up'
  })
    .click(function() {
      jQuery('html, body').animate({ scrollTop: 0 }, 'slow');
    })
    .affix({ offset: { top: 575 } })
);
