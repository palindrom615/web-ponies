const path = require("path");
const es = require("event-stream");
const fs = require("fs-extra");
const bomstrip = require('bomstrip');

const origDir = path.resolve(__dirname, "../Desktop-Ponies/Content/Ponies");
const destDir = path.resolve(__dirname, "../contents/ponies");

/**
 * pony.ini file uses its unique format. I have never seen such format.
 * Only what I know is that it's definitely NOT INI format. that's it.
 * I have not yet read counterpart code of the desktop-ponies. It will help
 * wrting some specification of the format though.
 *
 * This implementation of parsing the format is enough for parsing existing
 * pony.ini files, yet very imcomplete. It cannot deal with patterns such as:
 *
 * * negative number (e.g. -100)
 * * E-notation (e.g. 2.3e4)
 * * non-decimal value (e.g. 0x12)
 * * doublequote escape in string (e.g. "Lorem ipsum dolor sit amet, \"consectetur\" adipiscing elit")
 */
function parseLine(line) {
  /**
   * 6 types of ini tokens:
   *
   * 1. number
   * 1. boolean ("True" or "False")
   * 1. string with doublequote
   * 1. point, comma between two numbers surrounded by doublequote
   * 1. string withOUT doublequote (word)
   * 1. array surrounded with brace
   * 1. undefined value(e.g. "1,2,,3" => [1, 2, undefined, 3]
   */
  const tokenRegex = /(?:^|,)(?:(\d*\.?\d+)|(True|False)|"(\d+,\d+)"|"([^"]*)"|([\w \.#()']+)|{([^}]*)}|(\s?))/g;
  const res = [];
  for (let eachToken; eachToken = tokenRegex.exec(line); typeof eachToken !== 'null') {
    const [matched, numVal, boolVal, pointVal, quotVal, wordVal, arrVal, undefVal] = eachToken;
    if (typeof numVal !== 'undefined') {
      res.push(Number(numVal));
    } else if (typeof boolVal !== 'undefined') {
      res.push(boolVal === 'True');
    } else if (typeof pointVal !== 'undefined') {
      const [x, y] = pointVal.split(',').map(Number);
      res.push({ x, y });
    } else if (typeof quotVal !== 'undefined') {
      res.push(quotVal);
    } else if (typeof wordVal !== 'undefined') {
      res.push(wordVal);
    } else if (typeof arrVal !== 'undefined') {
      res.push(parseLine(arrVal));
    } else if (typeof undefVal !== 'undefined') {
      res.push(undefined);
    }
  }
  return res;
}

function insert(obj, prop, val) {
  if (typeof obj[prop] === "undefined") {
    obj[prop] = [val];
  } else {
    obj[prop].push(val);
  }
}

const iniLineToObj = ponyIni => line => {
  if (line === '')
    return;
  const [type, ...vals] = parseLine(line);

  switch (type) {
    case "":
    case undefined:
      return;
    case "Name": {
      const [name] = vals;
      ponyIni.name = name;
      break;
    }
    case "Behavior": {
      const [
        name,
        probability,
        maxduration,
        minduration,
        speed,
        rightimage,
        leftimage,
        movement,
        linked,
        speakstart,
        speakend,
        skip,
        x,
        y,
        follow,
        autoSelectImages,
        stopped,
        moving,
        rightcenter,
        leftcenter,
        dontRepeatAnimation,
        group
      ] = vals;

      const behavior = {
        name,
        probability,
        maxduration,
        minduration,
        speed,
        rightimage,
        leftimage,
        movement,
        linked,
        speakstart,
        speakend,
        skip,
        x,
        y,
        follow,
        autoSelectImages,
        stopped,
        moving,
        rightcenter,
        leftcenter,
        dontRepeatAnimation,
        group
      };
      insert(ponyIni, "behaviors", behavior);

      break;
    }
    case 'behaviorgroup': {
      const [num, name] = vals;
      ponyIni.behaviorgroups
        ? ponyIni.behaviorgroups[num] = name
        : ponyIni.behaviorgroups = {
          [num]: name
        };

      break;
    }
    case 'Interaction': {
      const [name, probability, proximity, targets, activate, behaviors, delay = 0] = vals;
      const interaction = {
        name,
        probability,
        proximity,
        targets,
        activate,
        behaviors,
        delay
      };
      insert(ponyIni, 'interactions', interaction);
      break;
    }
    case "Effect": {
      const [
        name,
        behavior,
        rightimage,
        leftimage,
        duration,
        delay,
        rightloc,
        rightcenter,
        leftloc,
        leftcenter,
        follow,
        dontRepeatAnimation
      ] = vals;

      const effect = {
        name,
        behavior,
        rightimage,
        leftimage,
        duration,
        delay,
        rightloc,
        rightcenter,
        leftloc,
        leftcenter,
        follow,
        dontRepeatAnimation
      };
      insert(ponyIni, "effects", effect);

      break;
    }
    case 'Speak': {
      const [name, text, files, skip, group] = vals;

      const speak = { name, text, files, skip, group };
      insert(ponyIni, 'speeches', speak);

      break;
    }
    case "Categories": {
      const categories = vals;
      categories.forEach(cat => insert(ponyIni, "categories", cat));
      break;
    }
    default: {
      insert(ponyIni, type, vals)
    }
  }
};

async function parseIniFile(dir) {
  const ponyIni = {
    baseurl: dir
  };
  const iniFileStream = fs.createReadStream(
    path.resolve(origDir, dir, "pony.ini")
  );
  iniFileStream
    .pipe(new bomstrip())
    .pipe(es.split())
    .pipe(es.map(iniLineToObj(ponyIni)));
  return new Promise((resolve, reject) => {
    iniFileStream.on("end", () => {
      fs.writeFile(
        path.resolve(destDir, dir, "pony.ini.json"),
        JSON.stringify(ponyIni)
      );
      resolve(ponyIni);
    });
    iniFileStream.on("error", reject);
  });
}

async function main() {
  const ponies = await fs.readdir(origDir);
  await fs.copy(origDir, destDir);
  const res = await Promise.all(ponies.map(async dir => await parseIniFile(dir)));
  await fs.writeFile(path.resolve(process.cwd(), 'contents/ponies/ponies.ini.json'), JSON.stringify(res));
}

main();
