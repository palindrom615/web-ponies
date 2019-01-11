import { observe, stopObserving, tag, windowSize } from './utils';

export default class Progressbar {
  bar: HTMLElement;
  label: HTMLElement;
  barcontainer: HTMLElement;
  container: HTMLElement;
  finished: boolean = false;

  constructor() {
    this.bar = tag('div', {
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
    });
    this.label = tag('div', {
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
    });
    this.barcontainer = tag(
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
      this.bar
    );
    this.container = tag(
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
          this.container.style.display = 'none';
        }
      },
      this.barcontainer,
      this.label
    );
  }

  renew(loaded: number, total: number) {
    this.finished = loaded === total;

    const progress = total === 0 ? 1.0 : loaded / total;
    this.bar.style.width = Math.round(progress * 450) + 'px';
    this.label.innerHTML = `Loading Ponies... ${Math.floor(
      progress * 100
    )}%`;
    if (!this.container.parentNode) {
      if (document.body) {
        this.insertProgressbar();
      } else {
        observe(window, 'load', this.insertProgressbar);
      }
    }

    if (this.finished) {
      setTimeout(() => {
        stopObserving(window, 'resize', this.centerProgressbar);
        stopObserving(window, 'load', this.insertProgressbar);
        if (this.container.parentNode) {
          this.container.parentNode.removeChild(
            this.container
          );
        }
      }, 500);
    }
  }

  insertProgressbar() {
    document.body.appendChild(this.container);
    this.centerProgressbar();
    setTimeout(() => {
      if (!this.finished) {
        this.container.style.display = '';
      }
    }, 250);
    observe(window, 'resize', this.centerProgressbar);
    stopObserving(window, 'load', this.insertProgressbar);
  }

  centerProgressbar() {
    const winsize = windowSize();
    let hide = false;
    if (this.container.style.display === 'none') {
      hide = true;
      this.container.style.visibility = 'hidden';
      this.container.style.display = '';
    }
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    const labelHeight = this.label.offsetHeight;
    if (hide) {
      this.container.style.display = 'none';
      this.container.style.visibility = '';
    }
    this.container.style.left =
      Math.round((winsize.width - width) * 0.5) + 'px';
    this.container.style.top =
      Math.round((winsize.height - height) * 0.5) + 'px';
    this.label.style.top =
      Math.round((height - labelHeight) * 0.5) + 'px';
  }

}
