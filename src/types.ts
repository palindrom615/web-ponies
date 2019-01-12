export type Rect = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export type Pos = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export enum Movements {
  Left,
  Right,
  Up,
  Down,
  UpLeft,
  UpRight,
  DownLeft,
  DownRight
}

export enum AllowedMoves {
  None = 'None',
  HorizontalOnly = 'HorizontalOnly',
  VerticalOnly = 'VerticalOnly',
  HorizontalVertical = 'HorizontalVertical',
  DiagonalOnly = 'DiagonalOnly',
  DiagonalHorizontal = 'DiagonalHorizontal',
  DiagonalVertical = 'DiagonalVertical',
  All = 'All',
  MouseOver = 'MouseOver',
  Sleep = 'Sleep',
  Dragged = 'Dragged'
}

export enum Locations {
  Top,
  Bottom,
  Left,
  Right,
  BottomRight,
  BottomLeft,
  TopRight,
  TopLeft,
  Center,
  Any,
  AnyNotCenter
}

export enum AudioMimeTypes {
  wav = 'audio/wav',
  webm = 'audio/webm',
  mpeg = 'audio/mpeg',
  mpga = 'audio/mpeg',
  mpg = 'audio/mpeg',
  mp1 = 'audio/mpeg;codecs="mp1"',
  mp2 = 'audio/mpeg;codecs="mp2"',
  mp3 = 'audio/mpeg;codecs="mp3"',
  mp4 = 'audio/mp4',
  mp4a = 'audio/mp4',
  ogg = 'audio/ogg',
  oga = 'audio/ogg',
  flac = 'audio/ogg;codecs="flac"',
  spx = 'audio/ogg;codecs="speex"'
}

export type RemoveQueue = {
  at: number;
  element: HTMLElement;
};

export type Callback = ((...args: any[]) => void);

export type Observer = (isSuccess: boolean) => void;

export type Load = (loader: Loader, url: string, observer: Observer) => void;

export type Loader = {
  loaded: boolean;
  callbacks: Callback[];
  object?: HTMLImageElement;
};

export type Resources = {
  [url: string]: Loader;
};

export type Config = {
  baseurl: string;
  speed: number;
  speakProbability: number;
  dontSpeak: boolean;
  volume: number;
  interval: number;
  fps: number;
  interactionInterval: number
  audioEnabled: boolean;
  showFps: boolean;
  isPreloadAll: boolean;
  showLoadProgress: boolean;
  fadeDuration: number;
  spawn: {
    [name: string]: number;
  },
  spawnRandom?: number;
  autoStart?: boolean,
  onload?: any;
};
