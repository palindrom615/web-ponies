import urlJoin from "proper-url-join";

import { AudioMimeTypes } from "./types";

export default class Speech {
  name: string;
  text: string;
  files: string[];
  skip: boolean;
  group: number;
  constructor(speak: Partial<Speech>, baseurl: string) {
    const { files, text, name, skip, group } = speak;
    this.name = name;
    this.text = text;
    this.skip = skip;
    this.group = group;
    if (files) {
      if (files.length > 0) {
        this.files = [];
        for (const file of files) {
          let ext = /(?:\.([^.]*))?$/.exec(file)[1];
          let filetype;
          if (ext) {
            ext = ext.toLowerCase();
            filetype = AudioMimeTypes[ext] || "audio/x-" + ext;
          } else {
            filetype = "audio/x-unknown";
          }
          if (filetype in speak.files) {
            console.warn(
              baseurl +
                ": file type " +
                filetype +
                " of speak line " +
                speak.name +
                " is not unique."
            );
          }
          this.files[filetype] = encodeURIComponent(file);
        }
      }
      this.files = files ? files.map(file => urlJoin(baseurl, file)) : [];
    }
  }
}
