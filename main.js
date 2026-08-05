var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ignore/index.js
var require_ignore = __commonJS({
  "node_modules/ignore/index.js"(exports, module2) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_TEST_BLANK_LINE = /^\s+$/;
    var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/;
    var SLASH = "/";
    var TMP_KEY_IGNORE = "node-ignore";
    if (typeof Symbol !== "undefined") {
      TMP_KEY_IGNORE = Symbol.for("node-ignore");
    }
    var KEY_IGNORE = TMP_KEY_IGNORE;
    var define = (object, key, value) => Object.defineProperty(object, key, { value });
    var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
    var RETURN_FALSE = () => false;
    var sanitizeRange = (range) => range.replace(
      REGEX_REGEXP_RANGE,
      (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
    );
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var REPLACERS = [
      [
        // remove BOM
        // TODO:
        // Other similar zero-width characters?
        /^\uFEFF/,
        () => EMPTY
      ],
      // > Trailing spaces are ignored unless they are quoted with backslash ("\")
      [
        // (a\ ) -> (a )
        // (a  ) -> (a)
        // (a ) -> (a)
        // (a \ ) -> (a  )
        /((?:\\\\)*?)(\\?\s+)$/,
        (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)
      ],
      // replace (\ ) with ' '
      // (\ ) -> ' '
      // (\\ ) -> '\\ '
      // (\\\ ) -> '\\ '
      [
        /(\\+?)\s/g,
        (_, m1) => {
          const { length } = m1;
          return m1.slice(0, length - length % 2) + SPACE;
        }
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match) => `\\${match}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^"
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/"
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*\\\*\\\*\\\//,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        /^(?=[^^])/,
        function startingReplacer() {
          return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
      ],
      // normal intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule,
        //    coz trailing single wildcard will be handed by [trailing wildcard]
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1, p2) => {
          const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
          return p1 + unescaped;
        }
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE
      ],
      [
        // > The range notation, e.g. [a-zA-Z],
        // > can be used to match one of the characters in a range.
        // `\` is escaped by step 3
        /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
        (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        /(?:[^*])$/,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
      ],
      // trailing wildcard
      [
        /(\^|\\\/)?\\\*$/,
        (_, p1) => {
          const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
          return `${prefix}(?=$|\\/$)`;
        }
      ]
    ];
    var regexCache = /* @__PURE__ */ Object.create(null);
    var makeRegex = (pattern, ignoreCase) => {
      let source = regexCache[pattern];
      if (!source) {
        source = REPLACERS.reduce(
          (prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)),
          pattern
        );
        regexCache[pattern] = source;
      }
      return ignoreCase ? new RegExp(source, "i") : new RegExp(source);
    };
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF);
    var IgnoreRule = class {
      constructor(origin, pattern, negative, regex) {
        this.origin = origin;
        this.pattern = pattern;
        this.negative = negative;
        this.regex = regex;
      }
    };
    var createRule = (pattern, ignoreCase) => {
      const origin = pattern;
      let negative = false;
      if (pattern.indexOf("!") === 0) {
        negative = true;
        pattern = pattern.substr(1);
      }
      pattern = pattern.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regex = makeRegex(pattern, ignoreCase);
      return new IgnoreRule(
        origin,
        pattern,
        negative,
        regex
      );
    };
    var throwError = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path, originalPath, doThrow) => {
      if (!isString(path)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path) => REGEX_TEST_INVALID_PATH.test(path);
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define(this, KEY_IGNORE, true);
        this._rules = [];
        this._ignoreCase = ignoreCase;
        this._allowRelativePaths = allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      _addPattern(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules);
          this._added = true;
          return;
        }
        if (checkPattern(pattern)) {
          const rule = createRule(pattern, this._ignoreCase);
          this._added = true;
          this._rules.push(rule);
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._addPattern, this);
        if (this._added) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      //          |           ignored : unignored
      // negative |   0:0   |   0:1   |   1:0   |   1:1
      // -------- | ------- | ------- | ------- | --------
      //     0    |  TEST   |  TEST   |  SKIP   |    X
      //     1    |  TESTIF |  SKIP   |  TEST   |    X
      // - SKIP: always skip
      // - TEST: always test
      // - TESTIF: only test if checkUnignored
      // - X: that never happen
      // @param {boolean} whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // @returns {TestResult} true if a file is ignored
      _testOne(path, checkUnignored) {
        let ignored = false;
        let unignored = false;
        this._rules.forEach((rule) => {
          const { negative } = rule;
          if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
            return;
          }
          const matched = rule.regex.test(path);
          if (matched) {
            ignored = !negative;
            unignored = negative;
          }
        });
        return {
          ignored,
          unignored
        };
      }
      // @returns {TestResult}
      _test(originalPath, cache, checkUnignored, slices) {
        const path = originalPath && checkPath.convert(originalPath);
        checkPath(
          path,
          originalPath,
          this._allowRelativePaths ? RETURN_FALSE : throwError
        );
        return this._t(path, cache, checkUnignored, slices);
      }
      _t(path, cache, checkUnignored, slices) {
        if (path in cache) {
          return cache[path];
        }
        if (!slices) {
          slices = path.split(SLASH);
        }
        slices.pop();
        if (!slices.length) {
          return cache[path] = this._testOne(path, checkUnignored);
        }
        const parent = this._t(
          slices.join(SLASH) + SLASH,
          cache,
          checkUnignored,
          slices
        );
        return cache[path] = parent.ignored ? parent : this._testOne(path, checkUnignored);
      }
      ignores(path) {
        return this._test(path, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path) => !this.ignores(path);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path) {
        return this._test(path, this._testCache, true);
      }
    };
    var factory = (options) => new Ignore(options);
    var isPathValid = (path) => checkPath(path && checkPath.convert(path), path, RETURN_FALSE);
    factory.isPathValid = isPathValid;
    factory.default = factory;
    module2.exports = factory;
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
    ) {
      const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGIX_IS_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path) => REGIX_IS_WINDOWS_PATH_ABSOLUTE.test(path) || isNotRelative(path);
    }
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CustomizeIconsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/types.ts
var PACK_PREFIXES = {
  "lucide-icons": "Li",
  "octicons": "Oc",
  "tabler-icons": "Ti",
  "coolicons": "Co",
  "simple-icons": "Si",
  "boxicons": "Bx",
  "feather-icons": "Fe",
  "font-awesome-solid": "Fa",
  "icon-brew": "Ib",
  "remix-icons": "Ri",
  "rpg-awesome": "Rp",
  "boxicons-solid": "Bo"
};
var PREFIX_TO_PACK = (() => {
  const map = {};
  for (const pack in PACK_PREFIXES) {
    map[PACK_PREFIXES[pack]] = pack;
  }
  map["Bo"] = "boxicons";
  return map;
})();
var DEFAULT_CONNECTIVITY_TOGGLES = {
  fileExplorer: true,
  tabs: true,
  title: true,
  links: true,
  bases: true
};
var DEFAULT_GRAPH_BANNER = {
  enable: false,
  ignore: [],
  timeToRemoveLeaf: 100,
  lazyRender: true
};
var DEFAULT_SETTINGS = {
  showInTabs: true,
  showAboveTitle: true,
  enableQualityColoring: true,
  defaultIconColor: "#878787",
  qualityExistsColor: "#4a9eff",
  qualityHighColor: "#22c55e",
  qualityHighThreshold: 7,
  showInLinks: true,
  showInEditor: true,
  showInBases: true,
  enableLivePreviewLinkIcons: false,
  enableConnectivityColoring: true,
  connectivityColor: "#e8a838",
  connectivityThreshold: 10,
  connectivityPenaltyFolders: "2. Day Planners, Templates, Week",
  connectivityToggles: DEFAULT_CONNECTIVITY_TOGGLES,
  folderIcons: {},
  iconPacksPath: ".obsidian/icons",
  graphBanner: DEFAULT_GRAPH_BANNER
};
var DEFAULT_FOLDER_ICONS = {
  "6. Readwise": { icon: "LiBookDown", color: "#878787" },
  "screenshots": { icon: "LiImage", color: "#878787" },
  "3. Evergreen & fleeting Notes": { icon: "TiNote", color: "#878787" },
  "0. Beliefs": { icon: "\u27B0", color: "" },
  "botwick projects & model chats": { icon: "RiChatNewLine", color: "#878787" },
  "4. Meetings": { icon: "OcPeople16", color: "#878787" },
  "2. Day Planners": { icon: "LiCalendarDays", color: "" },
  "Templates": { icon: "OcProjectTemplate24", color: "#878787" },
  "Companies": { icon: "LiRocket", color: "#858585" },
  "1. Pondering": { icon: "OcLightBulb24", color: "#858585" },
  "5. People pages": { icon: "OcPerson24", color: "#858585" },
  "Drawings": { icon: "SiExcalidraw", color: "#a9b1ac" },
  "6. Readwise/Podcasts": { icon: "TiEar", color: "#878787" },
  "6. Readwise/Podcasts/Data": { icon: "LiEar", color: "#878787" },
  "6. Readwise/Books": { icon: "LiBook", color: "#878787" },
  "6. Readwise/Articles": { icon: "OcBook24", color: "#878787" },
  "6. Readwise/Tweets": { icon: "IbTwitter", color: "#878787" },
  "6. Readwise/Movies and theatre, opera": { icon: "BoBxsFilm", color: "#a7a5a5" },
  "0. Claims": { icon: "\u27B0", color: "" },
  "Granola notes": { icon: "OcPeople16", color: "#878787" },
  "7. Posts": { icon: "OcPencil24", color: "#878787" }
};

// src/icons/render.ts
function isEmoji(str) {
  if (!str)
    return false;
  return str.length <= 4 && !/^[A-Z][a-z]/.test(str);
}
function createIconElement(svgString, color, qualityClass) {
  const span = document.createElement("span");
  if (svgString) {
    span.innerHTML = svgString;
    const svg = span.querySelector("svg");
    if (svg) {
      if (color) {
        svg.style.stroke = color;
        svg.style.color = color;
      }
      if (qualityClass)
        svg.classList.add(qualityClass);
    }
  }
  return span;
}
function createEmojiElement(emoji) {
  const span = document.createElement("span");
  span.classList.add("ci-emoji");
  span.textContent = emoji;
  return span;
}

// src/icons/index.ts
var iconCache = /* @__PURE__ */ new Map();
var iconIndex = [];
var iconIndexBuilt = false;
var BUNDLED_ICONS = null;
function setBundledIcons(icons) {
  BUNDLED_ICONS = icons;
}
function getBundledIcons() {
  return BUNDLED_ICONS;
}
function parseIconId(id) {
  if (!id)
    return null;
  if (isEmoji(id))
    return { type: "emoji", emoji: id };
  const prefix = id.substring(0, 2);
  const name = id.substring(2);
  const pack = PREFIX_TO_PACK[prefix];
  if (pack)
    return { type: "svg", pack, name, prefix };
  if (BUNDLED_ICONS && BUNDLED_ICONS[id])
    return { type: "svg", pack: "_raw", name: id, prefix: "" };
  return null;
}
async function loadSvg(adapter, iconsPath, pack, name) {
  var _a;
  let prefix = "";
  for (const p in PREFIX_TO_PACK) {
    if (PREFIX_TO_PACK[p] === pack) {
      prefix = p;
      break;
    }
  }
  const iconId = prefix + name;
  if (iconCache.has(iconId))
    return (_a = iconCache.get(iconId)) != null ? _a : null;
  if (BUNDLED_ICONS) {
    if (BUNDLED_ICONS[iconId]) {
      iconCache.set(iconId, BUNDLED_ICONS[iconId]);
      return BUNDLED_ICONS[iconId];
    }
    if (BUNDLED_ICONS[name]) {
      iconCache.set(iconId, BUNDLED_ICONS[name]);
      return BUNDLED_ICONS[name];
    }
  }
  const flatPath = iconsPath + "/customize-icons/" + iconId + ".svg";
  try {
    if (await adapter.exists(flatPath)) {
      const svg = await adapter.read(flatPath);
      iconCache.set(iconId, svg);
      return svg;
    }
  } catch (e) {
  }
  const packPath = iconsPath + "/" + pack + "/" + name + ".svg";
  try {
    if (await adapter.exists(packPath)) {
      const svg = await adapter.read(packPath);
      iconCache.set(iconId, svg);
      return svg;
    }
  } catch (e) {
  }
  iconCache.set(iconId, null);
  return null;
}
async function buildIconIndex(adapter, iconsPath) {
  if (iconIndexBuilt)
    return;
  iconIndex = [];
  for (const pack in PACK_PREFIXES) {
    const prefix = PACK_PREFIXES[pack];
    const dirPath = iconsPath + "/" + pack;
    try {
      if (!await adapter.exists(dirPath))
        continue;
      const files = await adapter.list(dirPath);
      if (files && files.files) {
        for (const file of files.files) {
          if (file.endsWith(".svg")) {
            const name = file.split("/").pop().replace(".svg", "");
            const id = prefix + name;
            iconIndex.push({ id, pack, name, prefix });
          }
        }
      }
    } catch (e) {
    }
  }
  iconIndexBuilt = true;
}
function resolveIconForPath(filePath, folderIcons) {
  const parts = filePath.split("/");
  parts.pop();
  for (let i = parts.length; i > 0; i--) {
    const folderPath = parts.slice(0, i).join("/");
    if (folderIcons[folderPath])
      return folderIcons[folderPath];
  }
  return null;
}

// src/scoring/quality.ts
var import_obsidian = require("obsidian");
var qualityCache = /* @__PURE__ */ new Map();
function getQualityScore(app, filePath) {
  if (qualityCache.has(filePath))
    return qualityCache.get(filePath);
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file || !(file instanceof import_obsidian.TFile))
    return null;
  const cache = app.metadataCache.getFileCache(file);
  if (!cache || !cache.frontmatter)
    return null;
  const score = cache.frontmatter["Quality score"];
  if (score === void 0 || score === null || score === "")
    return null;
  const num = parseFloat(String(score).replace(/"/g, ""));
  if (isNaN(num))
    return 0;
  qualityCache.set(filePath, num);
  return num;
}
function invalidateQualityFor(filePath) {
  qualityCache.delete(filePath);
}

// src/scoring/connectivity.ts
var connectivityCache = /* @__PURE__ */ new Map();
var state = { built: false };
function isConnectivityBuilt() {
  return state.built;
}
function invalidateConnectivity() {
  state.built = false;
}
function getConnectivityScore(filePath) {
  return connectivityCache.get(filePath) || 0;
}
function getAllConnectivityScores() {
  return Array.from(connectivityCache.values());
}
function getConnectivityCacheEntries() {
  return Array.from(connectivityCache.entries());
}
function buildConnectivityScores(app, settings) {
  connectivityCache.clear();
  const resolved = app.metadataCache.resolvedLinks;
  if (!resolved)
    return;
  const penaltyFolders = settings.connectivityPenaltyFolders.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  const inbound = {};
  for (const src in resolved) {
    const links = resolved[src];
    for (const target in links) {
      if (!inbound[target])
        inbound[target] = [];
      inbound[target].push(src);
    }
  }
  for (const file in resolved) {
    computeFileConnectivity(file, resolved, inbound, penaltyFolders);
  }
  for (const file in inbound) {
    if (!connectivityCache.has(file)) {
      computeFileConnectivity(file, resolved, inbound, penaltyFolders);
    }
  }
  state.built = true;
}
function computeFileConnectivity(file, resolved, inbound, penaltyFolders) {
  const ib = (inbound[file] || []).filter(
    (src) => !penaltyFolders.some((p) => src.startsWith(p))
  );
  const outLinks = resolved[file] || {};
  const outSet = new Set(Object.keys(outLinks));
  const bidir = ib.filter((s) => outSet.has(s)).length;
  const score = ib.length * 2 + bidir * 3;
  connectivityCache.set(file, score);
}

// src/decorators/reading-links.ts
function processReadingModeLinks(plugin, el, ctx) {
  if (!plugin.settings.showInLinks)
    return;
  const links = el.querySelectorAll("a.internal-link");
  for (const link of Array.from(links)) {
    if (link.querySelector(".customize-icons-link-icon"))
      continue;
    const href = link.getAttribute("data-href");
    if (!href)
      continue;
    const file = plugin.app.metadataCache.getFirstLinkpathDest(href, ctx.sourcePath || "");
    if (!file)
      continue;
    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig)
      continue;
    insertLinkIcon(plugin, link, file.path, iconConfig, "links");
  }
}
async function insertLinkIcon(plugin, link, filePath, iconConfig, surface = "links") {
  if (link.querySelector(":scope > .customize-icons-link-icon"))
    return;
  if (link.dataset.ciProcessed === "1")
    return;
  link.dataset.ciProcessed = "1";
  const parsed = parseIconId(iconConfig.icon);
  if (!parsed) {
    delete link.dataset.ciProcessed;
    return;
  }
  const span = document.createElement("span");
  span.classList.add("customize-icons-link-icon");
  const qualityInfo = plugin.getQualityColorInfo(filePath, surface);
  if (parsed.type === "emoji") {
    span.appendChild(createEmojiElement(parsed.emoji));
  } else {
    const svg = await loadSvg(
      plugin.app.vault.adapter,
      plugin.settings.iconPacksPath,
      parsed.pack,
      parsed.name
    );
    if (!svg)
      return;
    const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
    const iconEl = createIconElement(svg, color, qualityInfo.cssClass);
    span.appendChild(iconEl);
  }
  link.insertBefore(span, link.firstChild);
  link.insertBefore(document.createTextNode("\u2060"), span.nextSibling);
}

// src/decorators/file-explorer.ts
var import_obsidian2 = require("obsidian");
async function decorateFileExplorer(plugin) {
  if (plugin._decorating)
    return;
  plugin._decorating = true;
  try {
    document.querySelectorAll(".customize-icons-explorer-icon").forEach((el) => el.remove());
    const fileExplorer = plugin.app.workspace.getLeavesOfType("file-explorer")[0];
    if (!fileExplorer)
      return;
    const view = fileExplorer.view;
    if (!view || !view.fileItems)
      return;
    for (const path in view.fileItems) {
      const item = view.fileItems[path];
      if (!item || !item.selfEl)
        continue;
      let titleRowEl = null;
      if (item.file instanceof import_obsidian2.TFolder) {
        titleRowEl = item.selfEl.querySelector(":scope > .nav-folder-title");
      } else if (item.file instanceof import_obsidian2.TFile) {
        titleRowEl = item.selfEl.classList.contains("nav-file-title") ? item.selfEl : item.selfEl.querySelector(":scope > .nav-file-title");
      }
      if (!titleRowEl)
        continue;
      const titleEl = titleRowEl.querySelector(".nav-file-title-content, .nav-folder-title-content");
      if (!titleEl)
        continue;
      if (titleRowEl.querySelector(".customize-icons-explorer-icon"))
        continue;
      let iconConfig = null;
      if (item.file instanceof import_obsidian2.TFolder) {
        iconConfig = plugin.settings.folderIcons[item.file.path];
      } else if (item.file instanceof import_obsidian2.TFile) {
        iconConfig = resolveIconForPath(item.file.path, plugin.settings.folderIcons);
      }
      if (!iconConfig)
        continue;
      const parsed = parseIconId(iconConfig.icon);
      if (!parsed)
        continue;
      const span = document.createElement("span");
      span.classList.add("customize-icons-explorer-icon");
      if (parsed.type === "emoji") {
        span.appendChild(createEmojiElement(parsed.emoji));
      } else {
        const svg = await loadSvg(
          plugin.app.vault.adapter,
          plugin.settings.iconPacksPath,
          parsed.pack,
          parsed.name
        );
        if (!svg)
          continue;
        const qualityInfo = item.file instanceof import_obsidian2.TFile ? plugin.getQualityColorInfo(item.file.path, "fileExplorer") : { color: null, cssClass: null };
        const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
        span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
      }
      titleRowEl.insertBefore(span, titleEl);
    }
  } finally {
    plugin._decorating = false;
  }
}

// src/decorators/tabs.ts
async function decorateOpenTabs(plugin) {
  if (!plugin.settings.showInTabs)
    return;
  document.querySelectorAll(".customize-icons-tab-icon").forEach((el) => el.remove());
  const leaves = plugin.app.workspace.getLeavesOfType("markdown");
  for (const leaf of leaves) {
    const view = leaf.view;
    const file = view && view.file;
    if (!file)
      continue;
    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig)
      continue;
    const parsed = parseIconId(iconConfig.icon);
    if (!parsed)
      continue;
    const tabHeader = leaf.tabHeaderEl;
    if (!tabHeader)
      continue;
    const titleEl = tabHeader.querySelector(".workspace-tab-header-inner-title");
    if (!titleEl || !titleEl.parentElement)
      continue;
    const span = document.createElement("span");
    span.classList.add("customize-icons-tab-icon");
    if (parsed.type === "emoji") {
      span.appendChild(createEmojiElement(parsed.emoji));
    } else {
      const svg = await loadSvg(
        plugin.app.vault.adapter,
        plugin.settings.iconPacksPath,
        parsed.pack,
        parsed.name
      );
      if (!svg)
        continue;
      const qualityInfo = plugin.getQualityColorInfo(file.path, "tabs");
      const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
      span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
    }
    titleEl.parentElement.insertBefore(span, titleEl);
  }
}

// src/decorators/title.ts
async function addTitleIcon(plugin, leaf) {
  document.querySelectorAll(".customize-icons-title-icon").forEach((el) => el.remove());
  if (!plugin.settings.showAboveTitle)
    return;
  if (!leaf)
    return;
  const view = leaf.view;
  if (!view || !view.file)
    return;
  const iconConfig = resolveIconForPath(view.file.path, plugin.settings.folderIcons);
  if (!iconConfig)
    return;
  const parsed = parseIconId(iconConfig.icon);
  if (!parsed)
    return;
  const titleContainer = view.containerEl.querySelector(".inline-title");
  if (!titleContainer || !titleContainer.parentElement)
    return;
  const span = document.createElement("div");
  span.classList.add("customize-icons-title-icon");
  if (parsed.type === "emoji") {
    span.appendChild(createEmojiElement(parsed.emoji));
  } else {
    const svg = await loadSvg(
      plugin.app.vault.adapter,
      plugin.settings.iconPacksPath,
      parsed.pack,
      parsed.name
    );
    if (!svg)
      return;
    const qualityInfo = plugin.getQualityColorInfo(view.file.path, "title");
    const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
    span.appendChild(createIconElement(svg, color, qualityInfo.cssClass));
  }
  titleContainer.parentElement.insertBefore(span, titleContainer);
}

// src/decorators/bases.ts
function decorateBases(plugin) {
  if (!plugin.settings.showInBases)
    return;
  const containers = document.querySelectorAll(".bases-view");
  plugin._basesObservers.forEach((obs, el) => {
    if (!el.isConnected) {
      obs.disconnect();
      plugin._basesObservers.delete(el);
    }
  });
  for (const container of Array.from(containers)) {
    processBasesAnchors(plugin, container);
    setupBasesObserver(plugin, container);
  }
}
function processBasesAnchors(plugin, root) {
  if (!plugin.settings.showInBases)
    return;
  const anchors = root.querySelectorAll(".internal-link[data-href]");
  for (const link of Array.from(anchors)) {
    const el = link;
    if (el.dataset.ciProcessed === "1")
      continue;
    if (el.querySelector(".customize-icons-link-icon")) {
      el.dataset.ciProcessed = "1";
      continue;
    }
    const href = el.getAttribute("data-href");
    if (!href)
      continue;
    const file = plugin.app.metadataCache.getFirstLinkpathDest(href, "");
    if (!file)
      continue;
    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig)
      continue;
    el.dataset.ciProcessed = "1";
    insertLinkIcon(plugin, el, file.path, iconConfig, "bases");
  }
}
function setupBasesObserver(plugin, container) {
  if (plugin._basesObservers.has(container))
    return;
  let pending = null;
  const observer = new MutationObserver(() => {
    if (pending)
      return;
    pending = setTimeout(() => {
      pending = null;
      processBasesAnchors(plugin, container);
    }, 50);
  });
  observer.observe(container, { childList: true, subtree: true });
  plugin._basesObservers.set(container, observer);
}

// src/decorators/editor-links.ts
function createEditorExtension(plugin) {
  const cmView = require("@codemirror/view");
  return cmView.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        this.decorations = cmView.Decoration.none;
        this.decorateTimer = null;
        this.decorateLinks();
      }
      update(update) {
        if (update.docChanged || update.viewportChanged || update.transactions.length > 0) {
          if (this.decorateTimer)
            clearTimeout(this.decorateTimer);
          this.decorateTimer = setTimeout(() => this.decorateLinks(), 100);
        }
      }
      decorateLinks() {
        if (!plugin.settings.showInLinks)
          return;
        if (plugin.settings.enableLivePreviewLinkIcons)
          return;
        const dom = this.view.dom;
        const links = dom.querySelectorAll("a.internal-link");
        const activeFile = plugin.app.workspace.getActiveFile();
        const sourcePath = activeFile ? activeFile.path : "";
        for (const link of Array.from(links)) {
          if (link.querySelector(".customize-icons-link-icon"))
            continue;
          const href = link.getAttribute("data-href");
          if (!href)
            continue;
          const file = plugin.app.metadataCache.getFirstLinkpathDest(href, sourcePath);
          if (!file)
            continue;
          const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
          if (!iconConfig)
            continue;
          insertLinkIcon(plugin, link, file.path, iconConfig, "links");
        }
      }
      destroy() {
        if (this.decorateTimer)
          clearTimeout(this.decorateTimer);
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}

// src/live-preview/link-icon-field.ts
var import_state = require("@codemirror/state");
var import_view2 = require("@codemirror/view");
var import_language = require("@codemirror/language");

// src/live-preview/link-icon-widget.ts
var import_view = require("@codemirror/view");
var TITLE_TAG_RE = /<title[^>]*>[\s\S]*?<\/title>/gi;
var LinkIconWidget = class extends import_view.WidgetType {
  constructor(resolution) {
    super();
    this.resolution = resolution;
  }
  eq(other) {
    return other.resolution.linkpath === this.resolution.linkpath && other.resolution.color === this.resolution.color && other.resolution.qualityClass === this.resolution.qualityClass && other.resolution.svg === this.resolution.svg;
  }
  toDOM() {
    const span = document.createElement("span");
    span.classList.add("customize-icons-link-icon", "ci-live-preview-widget");
    span.setAttribute("data-linkpath", this.resolution.linkpath);
    const safeSvg = (this.resolution.svg || "").replace(TITLE_TAG_RE, "");
    span.innerHTML = safeSvg;
    const svg = span.querySelector("svg");
    if (svg) {
      const color = this.resolution.color;
      if (color) {
        svg.style.stroke = color;
        svg.style.color = color;
      }
      if (this.resolution.qualityClass)
        svg.classList.add(this.resolution.qualityClass);
      svg.style.pointerEvents = "none";
    }
    return span;
  }
  ignoreEvent() {
    return true;
  }
  destroy() {
  }
};

// src/live-preview/link-icon-field.ts
var INTERNAL_LINK_NODE_HINT = "hmd-internal-link";
function overlapsSelection(state2, from, to) {
  for (const range of state2.selection.ranges) {
    if (range.from <= to && range.to >= from)
      return true;
  }
  return false;
}
function buildDecorations(state2, resolve) {
  const builder = new import_state.RangeSetBuilder();
  let tree;
  try {
    tree = (0, import_language.syntaxTree)(state2);
  } catch (e) {
    return builder.finish();
  }
  if (!tree)
    return builder.finish();
  tree.iterate({
    enter(node) {
      const name = node.name || "";
      if (!name.includes(INTERNAL_LINK_NODE_HINT))
        return;
      if (overlapsSelection(state2, node.from, node.to))
        return;
      const linkpath = state2.doc.sliceString(node.from, node.to).trim();
      if (!linkpath)
        return;
      const resolution = resolve(linkpath);
      if (!resolution)
        return;
      const widget = new LinkIconWidget(resolution);
      const deco = import_view2.Decoration.widget({ widget, side: -1 });
      builder.add(node.from, node.from, deco);
    }
  });
  return builder.finish();
}
function createLinkIconField(resolve) {
  return import_state.StateField.define({
    create(state2) {
      return buildDecorations(state2, resolve);
    },
    update(oldSet, tr) {
      if (!tr.docChanged && !tr.selection && !tr.effects.length)
        return oldSet;
      return buildDecorations(tr.state, resolve);
    },
    provide: (f) => import_view2.EditorView.decorations.from(f)
  });
}

// src/live-preview/svg-cache.ts
var svgCache = /* @__PURE__ */ new Map();
function keyFor(pack, name) {
  return pack + "/" + name;
}
function prefixFor(pack) {
  for (const p in PREFIX_TO_PACK) {
    if (PREFIX_TO_PACK[p] === pack)
      return p;
  }
  return "";
}
function getSvgSync(pack, name) {
  var _a;
  const key = keyFor(pack, name);
  if (svgCache.has(key))
    return (_a = svgCache.get(key)) != null ? _a : null;
  const bundled = getBundledIcons();
  if (bundled) {
    const iconId = prefixFor(pack) + name;
    if (bundled[iconId]) {
      svgCache.set(key, bundled[iconId]);
      return bundled[iconId];
    }
    if (bundled[name]) {
      svgCache.set(key, bundled[name]);
      return bundled[name];
    }
  }
  return null;
}
async function warmSvg(adapter, iconsPath, pack, name) {
  const key = keyFor(pack, name);
  if (svgCache.has(key))
    return;
  const bundled = getBundledIcons();
  if (bundled) {
    const iconId2 = prefixFor(pack) + name;
    if (bundled[iconId2]) {
      svgCache.set(key, bundled[iconId2]);
      return;
    }
    if (bundled[name]) {
      svgCache.set(key, bundled[name]);
      return;
    }
  }
  const iconId = prefixFor(pack) + name;
  const flatPath = iconsPath + "/customize-icons/" + iconId + ".svg";
  try {
    if (await adapter.exists(flatPath)) {
      svgCache.set(key, await adapter.read(flatPath));
      return;
    }
  } catch (e) {
  }
  const packPath = iconsPath + "/" + pack + "/" + name + ".svg";
  try {
    if (await adapter.exists(packPath)) {
      svgCache.set(key, await adapter.read(packPath));
      return;
    }
  } catch (e) {
  }
  svgCache.set(key, null);
}

// src/live-preview/extension.ts
function createLivePreviewExtension(plugin) {
  const resolve = (linkpath) => {
    if (!plugin.settings.enableLivePreviewLinkIcons)
      return null;
    if (!plugin.settings.showInLinks)
      return null;
    const active = plugin.app.workspace.getActiveFile();
    const sourcePath = active ? active.path : "";
    const file = plugin.app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath);
    if (!file)
      return null;
    const iconConfig = resolveIconForPath(file.path, plugin.settings.folderIcons);
    if (!iconConfig)
      return null;
    const parsed = parseIconId(iconConfig.icon);
    if (!parsed)
      return null;
    const qualityInfo = plugin.getQualityColorInfo(file.path, "links");
    const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
    if (parsed.type === "emoji") {
      const emoji = parsed.emoji;
      const svg2 = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><text x="0" y="12" font-size="12">' + escapeXml(emoji) + "</text></svg>";
      return { svg: svg2, color: null, qualityClass: qualityInfo.cssClass, linkpath };
    }
    const svg = getSvgSync(parsed.pack, parsed.name);
    if (!svg)
      return null;
    return { svg, color, qualityClass: qualityInfo.cssClass, linkpath };
  };
  return createLinkIconField(resolve);
}
function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// src/graph-banner/banner-view.ts
var _GraphBannerView = class {
  constructor(app, timeToRemoveLeaf) {
    this.leaf = app.workspace.getLeaf("tab");
    this.hideTransientTab();
    this.setupLeafPromise = this.setupLeaf(timeToRemoveLeaf);
    const content = this.leaf.view.containerEl.find(".view-content");
    this.node = content;
    this.setupNode();
  }
  async setupLeaf(timeToRemoveLeaf) {
    await this.leaf.setViewState({ type: "localgraph" });
    const removeChild = () => {
      var _a, _b;
      try {
        (_b = (_a = this.leaf.parent) == null ? void 0 : _a.removeChild) == null ? void 0 : _b.call(_a, this.leaf);
      } catch (e) {
      }
    };
    if (timeToRemoveLeaf > 0)
      setTimeout(removeChild, timeToRemoveLeaf);
    else
      removeChild();
  }
  // Hide the transient tab header via CSS so the tab bar doesn't briefly
  // shift right when the banner leaf is created — that was making tab
  // clicks land on the wrong tab.
  hideTransientTab() {
    try {
      const tabHeader = this.leaf.tabHeaderEl;
      if (tabHeader) {
        tabHeader.style.display = "none";
        tabHeader.setAttribute("data-ci-transient", "1");
      }
      const container = this.leaf.containerEl;
      if (container)
        container.setAttribute("data-ci-transient", "1");
    } catch (e) {
    }
  }
  setupNode() {
    this.node.addClass(_GraphBannerView.nodeClass);
    const controls = this.node.find(".graph-controls");
    if (controls)
      controls.toggleClass("is-close", true);
    const overlay = document.createElement("div");
    overlay.addClass(_GraphBannerView.overlayNodeClass);
    const canvas = this.node.querySelector("canvas");
    this.node.insertBefore(overlay, canvas);
    overlay.addEventListener("pointerup", () => {
      if (this.isActive())
        return;
      this.setActive(true);
      this.startInteractiveRenderLoop();
      const controller = new AbortController();
      document.addEventListener(
        "pointerdown",
        (ev) => {
          if (!this.isActive())
            return;
          const target = ev.target;
          if (target && this.node.contains(target))
            return;
          this.setActive(false);
          controller.abort();
        },
        { signal: controller.signal }
      );
    });
  }
  startInteractiveRenderLoop() {
    const view = this.leaf.view;
    const renderer = view == null ? void 0 : view.renderer;
    if (!renderer || typeof renderer.render !== "function")
      return;
    const loop = () => {
      if (!this.isActive() || !this.node.isConnected)
        return;
      try {
        renderer.render();
      } catch (e) {
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  isActive() {
    return this.node.dataset.interactive === "true";
  }
  setActive(active) {
    this.node.dataset.interactive = active ? "true" : "false";
  }
  async placeTo(view, colorGroups) {
    var _a, _b, _c, _d;
    await this.setupLeafPromise;
    await this.leaf.setViewState({
      type: "localgraph",
      state: {
        file: (_a = view.file) == null ? void 0 : _a.path,
        // Some Obsidian versions read colorGroups from state.colorGroups,
        // others from state.options.colorGroups — send both to be safe.
        colorGroups: colorGroups || [],
        options: { colorGroups: colorGroups || [] }
      }
    });
    this.applyColorGroupsToRenderer(colorGroups || []);
    (_d = (_c = this.leaf).setGroup) == null ? void 0 : _d.call(_c, (_b = view.file) == null ? void 0 : _b.path);
    for (let attempt = 0; attempt < 20; attempt++) {
      const mode = view.getMode();
      const container = view.containerEl.find(
        `.markdown-${mode}-view`
      );
      if (container) {
        if (this.isDescendantOf(container)) {
          this.kickCanvas();
          this.scheduleAutoRecenter();
          return;
        }
        const inlineTitle = container.querySelector(".inline-title");
        if (inlineTitle && inlineTitle.parentElement) {
          inlineTitle.parentElement.insertBefore(this.node, inlineTitle.nextSibling);
          this.installRecenterButton();
          this.kickCanvas();
          this.scheduleAutoRecenter();
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  scheduleAutoRecenter() {
    for (const delay of [200, 900, 2200]) {
      setTimeout(() => {
        this.recenter();
      }, delay);
    }
    setTimeout(() => {
      this.recoverIfEmpty(0);
    }, 900);
  }
  // If the renderer has zero nodes after settling, the setViewState / retarget
  // silently failed (happens on large graphs, or wiki source pages that
  // Obsidian's metadata cache hasn't indexed yet). Recycle the leaf and
  // retry with backoff — up to 3 attempts spaced 500/1200/2500ms out.
  recoverIfEmpty(attempt) {
    var _a, _b;
    const view = this.leaf.view;
    const nodes = (_a = view == null ? void 0 : view.renderer) == null ? void 0 : _a.nodes;
    if (nodes && nodes.length > 0)
      return;
    const filePath = (_b = view == null ? void 0 : view.file) == null ? void 0 : _b.path;
    if (!filePath)
      return;
    if (attempt >= 3)
      return;
    (async () => {
      try {
        await this.leaf.setViewState({ type: "empty" });
        await this.leaf.setViewState({
          type: "localgraph",
          state: { file: filePath }
        });
        this.kickCanvas();
        setTimeout(() => {
          this.recenter();
          this.recoverIfEmpty(attempt + 1);
        }, 500 + attempt * 700);
      } catch (e) {
      }
    })();
  }
  async retargetTo(view, colorGroups) {
    var _a, _b, _c, _d, _e, _f;
    await this.setupLeafPromise;
    await this.leaf.setViewState({
      type: "localgraph",
      state: {
        file: (_a = view.file) == null ? void 0 : _a.path,
        // Some Obsidian versions read colorGroups from state.colorGroups,
        // others from state.options.colorGroups — send both to be safe.
        colorGroups: colorGroups || [],
        options: { colorGroups: colorGroups || [] }
      }
    });
    this.applyColorGroupsToRenderer(colorGroups || []);
    (_d = (_c = this.leaf).setGroup) == null ? void 0 : _d.call(_c, (_b = view.file) == null ? void 0 : _b.path);
    try {
      (_f = (_e = this.leaf).rebuildView) == null ? void 0 : _f.call(_e);
    } catch (e) {
    }
    this.kickCanvas();
    this.scheduleAutoRecenter();
  }
  // Push color groups into THIS banner's renderer. The banner's leaf is
  // detached from the tab bar, so it's not in workspace.getLeavesOfType and
  // won't be refreshed by the global sync's broadcast — we have to poke it
  // directly. Called from placeTo/retargetTo with the groups the manager
  // just synced.
  applyColorGroups(groups) {
    if (!Array.isArray(groups) || groups.length === 0)
      return;
    const view = this.leaf.view;
    const renderer = view == null ? void 0 : view.renderer;
    if (!renderer)
      return;
    let attempts = 0;
    const tick = () => {
      try {
        renderer.colorGroupOptions = groups;
        if (view.options)
          view.options.colorGroups = groups;
        if (typeof renderer.onOptionsChange === "function")
          renderer.onOptionsChange();
        if (typeof renderer.render === "function")
          renderer.render();
      } catch (e) {
      }
      attempts++;
      if (attempts < 3)
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  // Legacy — kept so old callers don't break.
  applyColorGroupsToRenderer(_groups) {
  }
  // Force the graph renderer to draw. Obsidian's local-graph pauses its
  // rAF loop when the leaf isn't the active leaf.
  kickCanvas() {
    const view = this.leaf.view;
    const renderer = view == null ? void 0 : view.renderer;
    if (!renderer)
      return;
    let attempts = 0;
    const tick = () => {
      try {
        if (typeof renderer.onResize === "function")
          renderer.onResize();
        if (typeof renderer.render === "function")
          renderer.render();
      } catch (e) {
      }
      attempts++;
      if (attempts < 6)
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  installRecenterButton() {
    if (this.node.querySelector(".graph-banner-recenter"))
      return;
    const btn = document.createElement("button");
    btn.classList.add("graph-banner-recenter");
    btn.setAttribute("aria-label", "Re-center graph");
    btn.textContent = "\u2316";
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.recenter();
    });
    this.node.appendChild(btn);
  }
  recenter() {
    const view = this.leaf.view;
    const renderer = view == null ? void 0 : view.renderer;
    if (!renderer)
      return;
    try {
      if (typeof renderer.reset === "function")
        renderer.reset();
      if (typeof renderer.centerAndZoom === "function")
        renderer.centerAndZoom(1);
      if (typeof renderer.setPan === "function")
        renderer.setPan(0, 0);
      if (typeof renderer.zoomTo === "function")
        renderer.zoomTo(1);
      if (typeof renderer.scale === "number")
        renderer.scale = 1;
      if (typeof renderer.px === "number")
        renderer.px = 0;
      if (typeof renderer.py === "number")
        renderer.py = 0;
      if (typeof renderer.targetScale === "number")
        renderer.targetScale = 1;
      if (typeof renderer.targetPx === "number")
        renderer.targetPx = 0;
      if (typeof renderer.targetPy === "number")
        renderer.targetPy = 0;
      if (typeof renderer.onResize === "function")
        renderer.onResize();
      if (typeof renderer.render === "function")
        renderer.render();
    } catch (e) {
    }
    this.pumpRenderer(30);
  }
  pumpRenderer(frames) {
    const view = this.leaf.view;
    const renderer = view == null ? void 0 : view.renderer;
    if (!renderer || typeof renderer.render !== "function")
      return;
    let n = 0;
    const tick = () => {
      try {
        renderer.render();
      } catch (e) {
      }
      n++;
      if (n < frames && this.node.isConnected)
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  isDescendantOf(el) {
    return el.contains(this.node);
  }
  setVisibility(visible) {
    this.node.toggleClass("hidden", !visible);
  }
  detach() {
    try {
      this.leaf.detach();
    } catch (e) {
    }
    this.node.removeClass(_GraphBannerView.nodeClass);
    if (this.node.parentElement) {
      this.node.parentElement.removeChild(this.node);
    }
  }
};
var GraphBannerView = _GraphBannerView;
GraphBannerView.nodeClass = "graph-banner-content";
GraphBannerView.overlayNodeClass = "graph-banner-overlay";

// src/graph-banner/banner-manager.ts
var GraphBannerManager = class {
  constructor(timeToRemoveLeaf) {
    this.graphViews = [];
    // Per-pane in-flight placement lock. file-open, active-leaf-change, and
    // layout-change can all fire in rapid succession for the same pane; without
    // this lock, they race and create multiple stacked banners.
    this.inFlight = /* @__PURE__ */ new Map();
    // Track which file each pane's banner is showing, so if a duplicate call
    // comes in for the same file we can skip work entirely.
    this.paneFile = /* @__PURE__ */ new Map();
    this.timeToRemoveLeaf = timeToRemoveLeaf;
  }
  async placeGraphView(app, view, ignoreMatcher, opts = {}) {
    var _a;
    const filePath = (_a = view.file) == null ? void 0 : _a.path;
    if (!filePath)
      return;
    const paneEl = view.containerEl;
    const pending = this.inFlight.get(paneEl);
    if (pending) {
      await pending;
      if (this.paneFile.get(paneEl) === filePath && !opts.forceFresh)
        return;
    }
    if (!opts.forceFresh && this.paneFile.get(paneEl) === filePath)
      return;
    const run = this.doPlace(app, view, ignoreMatcher, opts, paneEl, filePath);
    this.inFlight.set(paneEl, run);
    try {
      await run;
    } finally {
      if (this.inFlight.get(paneEl) === run)
        this.inFlight.delete(paneEl);
    }
  }
  async doPlace(app, view, ignoreMatcher, opts, paneEl, filePath) {
    const ignored = ignoreMatcher.test(filePath);
    const existing = this.graphViews.find((v) => v.isDescendantOf(paneEl));
    if (existing && !opts.forceFresh) {
      existing.setVisibility(!ignored);
      await existing.retargetTo(view, opts.colorGroups);
      if (opts.colorGroups)
        existing.applyColorGroups(opts.colorGroups);
      this.paneFile.set(paneEl, filePath);
      return;
    }
    if (opts.forceFresh && existing) {
      const staleIdx = this.graphViews.indexOf(existing);
      existing.detach();
      if (staleIdx >= 0)
        this.graphViews.splice(staleIdx, 1);
    }
    const bannerView = this.findAvailableGraphView(app, view);
    bannerView.setVisibility(!ignored);
    await bannerView.placeTo(view, opts.colorGroups);
    if (opts.colorGroups)
      bannerView.applyColorGroups(opts.colorGroups);
    this.paneFile.set(paneEl, filePath);
  }
  findAvailableGraphView(app, view) {
    const existing = this.graphViews.find((v) => v.isDescendantOf(view.containerEl));
    if (existing)
      return existing;
    const markdownContainers = app.workspace.getLeavesOfType("markdown").map((l) => l.view.containerEl);
    for (const bannerView of this.graphViews) {
      if (!markdownContainers.some((c) => bannerView.isDescendantOf(c)))
        return bannerView;
    }
    const fresh = new GraphBannerView(app, this.timeToRemoveLeaf);
    this.graphViews.push(fresh);
    return fresh;
  }
  detachAll() {
    for (const v of this.graphViews)
      v.detach();
    this.graphViews = [];
    this.inFlight.clear();
    this.paneFile.clear();
  }
  /**
   * True if a banner is currently mounted in this pane AND it's targeting the
   * given file path. Lazy mode uses this to leave revealed banners alone when
   * a follow-up layout-change fires for the same file.
   */
  paneShowsFile(paneEl, filePath) {
    if (this.paneFile.get(paneEl) !== filePath)
      return false;
    return this.graphViews.some((v) => v.isDescendantOf(paneEl));
  }
  /**
   * Detach any banner in the given pane. Used by lazy mode when the file
   * changes: the old banner (mounted for a different file) is torn down so
   * a fresh placeholder can be inserted for the new file.
   */
  detachInPane(paneEl) {
    const idx = this.graphViews.findIndex((v) => v.isDescendantOf(paneEl));
    if (idx >= 0) {
      this.graphViews[idx].detach();
      this.graphViews.splice(idx, 1);
    }
    this.paneFile.delete(paneEl);
    this.inFlight.delete(paneEl);
  }
};

// src/graph-banner/ignore-matcher.ts
var import_ignore = __toESM(require_ignore());
var IgnoreMatcher = class {
  constructor() {
    this.matcher = (0, import_ignore.default)();
  }
  add(patterns) {
    this.matcher.add(patterns);
    return this;
  }
  test(path) {
    if (!path)
      return false;
    return this.matcher.ignores(path);
  }
};

// src/graph-banner/color-groups.ts
var CI_TAG = "__ci_managed__";
function hexToRgbInt(hex) {
  const cleaned = (hex || "").replace(/^#/, "").trim();
  if (!/^[0-9a-f]{6}$/i.test(cleaned))
    return 0;
  return parseInt(cleaned, 16);
}
function lighten(hex, t) {
  const int = hexToRgbInt(hex);
  const r = int >> 16 & 255;
  const g = int >> 8 & 255;
  const b = int & 255;
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return lr << 16 | lg << 8 | lb;
}
function pathsToQueries(paths) {
  const chunks = [];
  for (let i = 0; i < paths.length; i += 100) {
    chunks.push(paths.slice(i, i + 100));
  }
  return chunks.map(
    (chunk) => chunk.map((p) => `path:"${p.replace(/"/g, '\\"')}"`).join(" OR ")
  );
}
function buildLocalGraphColorGroups(app, settings) {
  const groups = [];
  if (settings.enableQualityColoring) {
    groups.push({
      color: { a: 1, rgb: hexToRgbInt(settings.qualityHighColor) },
      query: `["Quality score":>=${settings.qualityHighThreshold}]`
    });
    groups.push({
      color: { a: 1, rgb: hexToRgbInt(settings.qualityExistsColor) },
      query: '["Quality score":true]'
    });
  }
  if (settings.enableConnectivityColoring) {
    if (!isConnectivityBuilt())
      buildConnectivityScores(app, settings);
    const entries = getConnectivityCacheEntries().filter(([, s]) => s >= settings.connectivityThreshold).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      const tier1Idx = Math.max(1, Math.floor(entries.length * 0.1));
      const tier2Idx = Math.max(tier1Idx + 1, Math.floor(entries.length * 0.35));
      const tier1 = entries.slice(0, tier1Idx).map((e) => e[0]);
      const tier2 = entries.slice(tier1Idx, tier2Idx).map((e) => e[0]);
      const tier3 = entries.slice(tier2Idx).map((e) => e[0]);
      const baseHex = settings.connectivityColor;
      const tierColors = [
        [tier1, lighten(baseHex, 0)],
        // full color — strongest hubs
        [tier2, lighten(baseHex, 0.35)],
        // medium — solid hubs
        [tier3, lighten(baseHex, 0.65)]
        // lightest — moderately connected
      ];
      for (const [paths, rgb] of tierColors) {
        for (const query of pathsToQueries(paths)) {
          if (!query)
            continue;
          groups.push({ color: { a: 1, rgb }, query });
        }
      }
    }
  }
  return groups;
}
function syncColorGroupsToGraphPlugin(app, settings) {
  var _a, _b, _c;
  const ours = buildLocalGraphColorGroups(app, settings).map((g) => ({
    ...g,
    [CI_TAG]: true
  }));
  try {
    const gp = (_c = (_b = (_a = app == null ? void 0 : app.internalPlugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b.graph) == null ? void 0 : _c.instance;
    if (!gp || !gp.options)
      return ours;
    const existing = Array.isArray(gp.options.colorGroups) ? gp.options.colorGroups.filter((g) => !g[CI_TAG]) : [];
    const merged = [...ours, ...existing];
    const changed = JSON.stringify(gp.options.colorGroups) !== JSON.stringify(merged);
    if (changed) {
      gp.options.colorGroups = merged;
      if (typeof gp.saveOptions === "function")
        gp.saveOptions();
      const refresh = (leafType) => {
        app.workspace.getLeavesOfType(leafType).forEach((l) => {
          try {
            const view = l.view;
            if (view == null ? void 0 : view.options)
              view.options.colorGroups = merged;
            if (view == null ? void 0 : view.renderer) {
              view.renderer.colorGroupOptions = merged;
              if (typeof view.renderer.onOptionsChange === "function") {
                view.renderer.onOptionsChange();
              }
              if (typeof view.renderer.render === "function")
                view.renderer.render();
            }
          } catch (e) {
          }
        });
      };
      refresh("graph");
      refresh("localgraph");
    }
    return merged;
  } catch (e) {
  }
  return ours;
}

// src/graph-banner/placeholder.ts
var VY_STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><circle cx="12" cy="12" r="3"/><path d="M12 3 c 0 3 0 5 0 6"/><path d="M12 15 c 0 3 0 5 0 6"/><path d="M3 12 c 3 0 5 0 6 0"/><path d="M15 12 c 3 0 5 0 6 0"/><path d="M6 6 c 1.5 1.5 3 3 4 4"/><path d="M14 14 c 1.5 1.5 3 3 4 4"/><path d="M18 6 c -1.5 1.5 -3 3 -4 4"/><path d="M10 14 c -1.5 1.5 -3 3 -4 4"/><circle cx="12" cy="3" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="21" r="0.6" fill="currentColor" stroke="none"/><circle cx="3" cy="12" r="0.6" fill="currentColor" stroke="none"/><circle cx="21" cy="12" r="0.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none"/></svg>`;
var _GraphBannerPlaceholder = class {
  /**
   * Idempotent: insert (or update) a placeholder button in the view's header.
   * If a real banner is already mounted in this view, do nothing — the user
   * has already opted in for this file.
   */
  static async ensureIn(view, onReveal) {
    const mode = view.getMode();
    for (let attempt = 0; attempt < 20; attempt++) {
      const container = view.containerEl.find(
        `.markdown-${mode}-view`
      );
      if (container) {
        if (container.querySelector(".graph-banner-content"))
          return;
        const existing = container.querySelector(
          "." + _GraphBannerPlaceholder.nodeClass
        );
        if (existing) {
          existing.onclick = (ev) => {
            ev.stopPropagation();
            existing.remove();
            onReveal();
          };
          return;
        }
        const inlineTitle = container.querySelector(".inline-title");
        if (inlineTitle) {
          const btn = document.createElement("button");
          btn.classList.add(_GraphBannerPlaceholder.nodeClass);
          btn.setAttribute("type", "button");
          btn.setAttribute("aria-label", "Show local graph for this note");
          btn.innerHTML = VY_STAR_SVG;
          btn.onclick = (ev) => {
            ev.stopPropagation();
            btn.remove();
            onReveal();
          };
          inlineTitle.appendChild(btn);
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  /** Remove any placeholder inside this view (used when detaching). */
  static removeFrom(view) {
    const nodes = view.containerEl.querySelectorAll(
      "." + _GraphBannerPlaceholder.nodeClass
    );
    nodes.forEach((n) => {
      var _a;
      return (_a = n.parentElement) == null ? void 0 : _a.removeChild(n);
    });
  }
  /** Sweep every placeholder in the document. Used on plugin unload. */
  static removeAll() {
    document.querySelectorAll("." + _GraphBannerPlaceholder.nodeClass).forEach((n) => {
      var _a;
      return (_a = n.parentElement) == null ? void 0 : _a.removeChild(n);
    });
  }
};
var GraphBannerPlaceholder = _GraphBannerPlaceholder;
GraphBannerPlaceholder.nodeClass = "graph-banner-placeholder";

// src/logger.ts
var LOG_PATH = "debug.log";
var LOG_ROTATED_PATH = "debug.log.1";
var MAX_BYTES = 2 * 1024 * 1024;
var ErrorLogger = class {
  constructor(app) {
    this.currentSize = 0;
    this.installed = false;
    this.app = app;
    this.originalConsoleError = console.error.bind(console);
    this.errorHandler = (ev) => {
      this.write("error", `${ev.message}
${ev.error && ev.error.stack || ""}`);
    };
    this.rejectionHandler = (ev) => {
      const reason = ev.reason;
      const msg = reason && reason.stack ? reason.stack : String(reason);
      this.write("unhandledRejection", msg);
    };
  }
  async install() {
    var _a;
    if (this.installed)
      return;
    this.installed = true;
    try {
      const existing = await this.app.vault.adapter.exists(LOG_PATH);
      if (existing) {
        const stat = await this.app.vault.adapter.stat(LOG_PATH);
        this.currentSize = (_a = stat == null ? void 0 : stat.size) != null ? _a : 0;
      }
    } catch (e) {
      this.currentSize = 0;
    }
    await this.write("session", `logger installed at ${new Date().toISOString()}`);
    const orig = this.originalConsoleError;
    const self = this;
    console.error = function(...args) {
      try {
        const msg = args.map((a) => a instanceof Error ? `${a.message}
${a.stack || ""}` : String(a)).join(" ");
        void self.write("console.error", msg);
      } catch (e) {
      }
      orig(...args);
    };
    window.addEventListener("error", this.errorHandler);
    window.addEventListener("unhandledrejection", this.rejectionHandler);
  }
  uninstall() {
    if (!this.installed)
      return;
    this.installed = false;
    console.error = this.originalConsoleError;
    window.removeEventListener("error", this.errorHandler);
    window.removeEventListener("unhandledrejection", this.rejectionHandler);
  }
  async write(kind, msg) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${kind}] ${msg}
`;
    try {
      if (this.currentSize + line.length > MAX_BYTES) {
        try {
          if (await this.app.vault.adapter.exists(LOG_ROTATED_PATH)) {
            await this.app.vault.adapter.remove(LOG_ROTATED_PATH);
          }
          await this.app.vault.adapter.rename(LOG_PATH, LOG_ROTATED_PATH);
        } catch (e) {
        }
        this.currentSize = 0;
      }
      await this.app.vault.adapter.append(LOG_PATH, line);
      this.currentSize += line.length;
    } catch (e) {
      this.originalConsoleError("[ErrorLogger] write failed:", e);
    }
  }
};

// src/settings.ts
var import_obsidian4 = require("obsidian");

// src/icon-picker-modal.ts
var import_obsidian3 = require("obsidian");
var IconPickerModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, onSelect) {
    super(app);
    this.plugin = plugin;
    this.onSelect = onSelect;
    this.allIcons = [];
  }
  async onOpen() {
    const contentEl = this.contentEl;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Pick an Icon" });
    const searchInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Search icons...",
      cls: "ci-icon-picker-search"
    });
    searchInput.style.width = "100%";
    searchInput.style.marginBottom = "12px";
    searchInput.style.padding = "8px";
    searchInput.style.fontSize = "14px";
    const emojiRow = contentEl.createDiv();
    emojiRow.style.marginBottom = "12px";
    emojiRow.style.display = "flex";
    emojiRow.style.gap = "8px";
    emojiRow.style.alignItems = "center";
    emojiRow.createEl("span", { text: "Or type emoji: " });
    const emojiInput = emojiRow.createEl("input", {
      type: "text",
      placeholder: "\u27B0"
    });
    emojiInput.style.width = "60px";
    emojiInput.style.fontSize = "18px";
    emojiInput.style.textAlign = "center";
    const emojiBtn = emojiRow.createEl("button", { text: "Use Emoji" });
    emojiBtn.addEventListener("click", () => {
      const val = emojiInput.value.trim();
      if (val) {
        this.onSelect(val);
        this.close();
      }
    });
    const gridContainer = contentEl.createDiv({ cls: "ci-icon-picker-container" });
    const seen = /* @__PURE__ */ new Set();
    const bundled = getBundledIcons();
    if (bundled) {
      for (const id in bundled) {
        this.allIcons.push({ id, svg: bundled[id] });
        seen.add(id);
      }
    }
    const flatPath = this.plugin.settings.iconPacksPath + "/customize-icons";
    try {
      const listing = await this.app.vault.adapter.list(flatPath);
      if (listing && listing.files) {
        for (const filePath of listing.files) {
          if (!filePath.endsWith(".svg"))
            continue;
          const id = filePath.split("/").pop().replace(".svg", "");
          const svg = await this.app.vault.adapter.read(filePath);
          if (!svg || svg.length <= 50)
            continue;
          if (seen.has(id)) {
            const idx = this.allIcons.findIndex((i) => i.id === id);
            if (idx >= 0)
              this.allIcons[idx] = { id, svg };
          } else {
            this.allIcons.push({ id, svg });
            seen.add(id);
          }
        }
      }
    } catch (e) {
    }
    this.allIcons.sort((a, b) => a.id.localeCompare(b.id));
    this.renderGrid(gridContainer, this.allIcons);
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      const filtered = this.allIcons.filter((icon) => icon.id.toLowerCase().includes(query));
      this.renderGrid(gridContainer, filtered);
    });
    searchInput.focus();
  }
  renderGrid(container, icons) {
    container.empty();
    if (icons.length === 0) {
      container.createEl("p", { text: "No icons found", cls: "setting-item-description" });
      return;
    }
    const grid = container.createDiv({ cls: "ci-icon-picker-grid" });
    for (const icon of icons) {
      const item = grid.createDiv({ cls: "ci-icon-picker-item" });
      item.setAttribute("title", icon.id);
      item.innerHTML = icon.svg;
      const svg = item.querySelector("svg");
      if (svg) {
        svg.style.width = "20px";
        svg.style.height = "20px";
        svg.style.stroke = "currentColor";
      }
      const iconId = icon.id;
      item.addEventListener("click", () => {
        this.onSelect(iconId);
        this.close();
      });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/settings.ts
function pct(scores, p) {
  if (scores.length === 0)
    return 0;
  const idx = Math.min(scores.length - 1, Math.floor(scores.length * p / 100));
  return scores[idx];
}
function renderConnectivityStats(el, scores, currentThreshold) {
  if (scores.length === 0) {
    el.createEl("p", {
      text: "No connectivity scores computed \u2014 vault may have no resolved links.",
      cls: "setting-item-description"
    });
    return;
  }
  const total = scores.length;
  const nonZero = scores.filter((s) => s > 0).length;
  const max = scores[scores.length - 1];
  const summary = el.createDiv({ cls: "ci-stats-summary" });
  summary.createEl("p", {
    text: `Scored ${total.toLocaleString()} files (${nonZero.toLocaleString()} non-zero). Max score: ${max}.`,
    cls: "setting-item-description"
  });
  const grid = el.createDiv({ cls: "ci-stats-grid" });
  const percentiles = [
    ["Median", 50],
    ["P75", 75],
    ["P80", 80],
    ["P90", 90],
    ["P95", 95],
    ["P99", 99]
  ];
  for (const [label, p] of percentiles) {
    const row = grid.createDiv({ cls: "ci-stats-row" });
    row.createSpan({ text: label, cls: "ci-stats-label" });
    row.createSpan({ text: String(pct(scores, p)), cls: "ci-stats-val" });
  }
  el.createEl("h4", { text: "Files above threshold" });
  const table = el.createDiv({ cls: "ci-stats-thresholds" });
  const candidateThresholds = [5, 7, 9, 10, 12, 15, 20, 30, 50];
  if (!candidateThresholds.includes(currentThreshold))
    candidateThresholds.push(currentThreshold);
  candidateThresholds.sort((a, b) => a - b);
  for (const t of candidateThresholds) {
    const above = scores.filter((s) => s >= t).length;
    const pctAbove = (above * 100 / total).toFixed(1);
    const row = table.createDiv({ cls: "ci-stats-row" });
    const label = row.createSpan({
      text: `\u2265 ${t}${t === currentThreshold ? " (current)" : ""}`,
      cls: "ci-stats-label"
    });
    if (t === currentThreshold)
      label.style.fontWeight = "bold";
    row.createSpan({
      text: `${above.toLocaleString()} files (${pctAbove}%)`,
      cls: "ci-stats-val"
    });
  }
}
var CONNECTIVITY_SURFACES = [
  { key: "fileExplorer", name: "  File explorer", desc: "Left-sidebar file tree" },
  { key: "tabs", name: "  Tab bar", desc: "Workspace tab headers" },
  { key: "title", name: "  Above note title", desc: "Icon above the inline title" },
  { key: "links", name: "  Inline wikilinks", desc: "Icons on [[wikilinks]] in the note body" },
  { key: "bases", name: "  Bases views", desc: "Icons in Bases tables, lists, and cards" }
];
var CustomizeIconsSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "Customize Icons" });
    el.createEl("h3", { text: "Display" });
    new import_obsidian4.Setting(el).setName("Show icon in tab bar").setDesc("Display file icon in the tab header").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showInTabs).onChange(async (val) => {
        this.plugin.settings.showInTabs = val;
        await this.plugin.saveSettings();
        this.plugin.decorateOpenTabs();
      })
    );
    new import_obsidian4.Setting(el).setName("Show icons in page body").setDesc(
      "Show folder icons next to inline [[wikilinks]] in the note body (reading mode + live preview). Makes it visible at a glance which folder each linked file lives in \u2014 e.g. a red circle for elevated claims in 0. Claims/, no icon for candidates still in wiki/claims/."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showInLinks).onChange(async (val) => {
        this.plugin.settings.showInLinks = val;
        await this.plugin.saveSettings();
        if (val) {
          this.plugin.app.workspace.trigger("layout-change");
        } else {
          document.querySelectorAll(
            ".markdown-preview-view .customize-icons-link-icon, .markdown-source-view .customize-icons-link-icon"
          ).forEach((el2) => el2.remove());
        }
      })
    );
    new import_obsidian4.Setting(el).setName("Live Preview link icons (experimental)").setDesc(
      "Inject folder icons on [[wikilinks]] in the editor while writing, using a proper CM6 Widget decoration. Off by default \u2014 first release opt-in."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableLivePreviewLinkIcons).onChange(async (val) => {
        this.plugin.settings.enableLivePreviewLinkIcons = val;
        await this.plugin.saveSettings();
        if (val)
          await this.plugin.warmLivePreviewCache();
        this.plugin.app.workspace.trigger("layout-change");
        new import_obsidian4.Notice(
          val ? "Live Preview link icons ON \u2014 reload the editor if icons don't appear." : "Live Preview link icons OFF."
        );
      })
    );
    new import_obsidian4.Setting(el).setName("Toggle icons while editing notes").setDesc("Show icons in the editor (e.g., :LiSofa: rendered as an icon in your notes)").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showInEditor).onChange(async (val) => {
        this.plugin.settings.showInEditor = val;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(el).setName("Show icons in Bases views").setDesc("Display file icons next to note names in Bases tables, lists, and cards").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showInBases).onChange(async (val) => {
        this.plugin.settings.showInBases = val;
        await this.plugin.saveSettings();
        if (val) {
          this.plugin.decorateBases();
        } else {
          this.plugin._basesObservers.forEach((obs) => obs.disconnect());
          this.plugin._basesObservers.clear();
          document.querySelectorAll(".bases-view .customize-icons-link-icon").forEach((el2) => el2.remove());
          document.querySelectorAll(".bases-view .internal-link[data-ci-processed]").forEach((el2) => el2.removeAttribute("data-ci-processed"));
        }
      })
    );
    new import_obsidian4.Setting(el).setName("Show icon above title").setDesc("Display file icon above the note title").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showAboveTitle).onChange(async (val) => {
        this.plugin.settings.showAboveTitle = val;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(el).setName("Default icon color").setDesc("Default color for SVG icons").addColorPicker(
      (picker) => picker.setValue(this.plugin.settings.defaultIconColor).onChange(async (val) => {
        this.plugin.settings.defaultIconColor = val;
        await this.plugin.saveSettings();
        this.plugin.decorateFileExplorer();
        this.plugin.decorateOpenTabs();
      })
    );
    el.createEl("h3", { text: "Quality Score Coloring" });
    new import_obsidian4.Setting(el).setName("Enable quality score coloring").setDesc("Tint icons based on the note's Quality score frontmatter field").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableQualityColoring).onChange(async (val) => {
        this.plugin.settings.enableQualityColoring = val;
        await this.plugin.saveSettings();
        this.plugin.decorateFileExplorer();
        this.plugin.decorateOpenTabs();
      })
    );
    new import_obsidian4.Setting(el).setName("Quality exists color").setDesc("Icon color when a Quality score exists (any value)").addColorPicker(
      (picker) => picker.setValue(this.plugin.settings.qualityExistsColor).onChange(async (val) => {
        this.plugin.settings.qualityExistsColor = val;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(el).setName("Quality high color").setDesc("Icon color when Quality score is >= threshold").addColorPicker(
      (picker) => picker.setValue(this.plugin.settings.qualityHighColor).onChange(async (val) => {
        this.plugin.settings.qualityHighColor = val;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(el).setName("Quality high threshold").setDesc("Score at or above which the 'high' color is used").addText(
      (text) => text.setValue(String(this.plugin.settings.qualityHighThreshold)).onChange(async (val) => {
        const num = parseInt(val);
        if (!isNaN(num)) {
          this.plugin.settings.qualityHighThreshold = num;
          await this.plugin.saveSettings();
        }
      })
    );
    el.createEl("h3", { text: "Connectivity Coloring" });
    new import_obsidian4.Setting(el).setName("Enable connectivity coloring").setDesc("Tint icons for notes with many inbound + bidirectional links").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableConnectivityColoring).onChange(async (val) => {
        this.plugin.settings.enableConnectivityColoring = val;
        await this.plugin.saveSettings();
        invalidateConnectivity();
        this.plugin.decorateFileExplorer();
        this.plugin.decorateOpenTabs();
      })
    );
    new import_obsidian4.Setting(el).setName("Connectivity color").setDesc("Icon color when connectivity score meets threshold").addColorPicker(
      (picker) => picker.setValue(this.plugin.settings.connectivityColor).onChange(async (val) => {
        this.plugin.settings.connectivityColor = val;
        await this.plugin.saveSettings();
        this.plugin.decorateFileExplorer();
        this.plugin.decorateOpenTabs();
      })
    );
    new import_obsidian4.Setting(el).setName("Connectivity threshold").setDesc(
      "Score at or above which the high color is used. Score = (inbound links * 2) + (bidirectional links * 3). Click 'Show vault stats' below for your current vault's distribution."
    ).addText(
      (text) => text.setValue(String(this.plugin.settings.connectivityThreshold)).onChange(async (val) => {
        const num = parseInt(val);
        if (!isNaN(num)) {
          this.plugin.settings.connectivityThreshold = num;
          await this.plugin.saveSettings();
          invalidateConnectivity();
        }
      })
    );
    const statsBox = el.createDiv({ cls: "ci-connectivity-stats" });
    new import_obsidian4.Setting(el).setName("Vault connectivity distribution").setDesc(
      "Compute live percentiles and how many files land above common thresholds. Uses the same scoring logic as the icon coloring."
    ).addButton(
      (btn) => btn.setButtonText("Show vault stats").setCta().onClick(async () => {
        btn.setDisabled(true).setButtonText("Computing...");
        try {
          statsBox.empty();
          invalidateConnectivity();
          buildConnectivityScores(this.plugin.app, this.plugin.settings);
          const scores = getAllConnectivityScores().sort((a, b) => a - b);
          renderConnectivityStats(statsBox, scores, this.plugin.settings.connectivityThreshold);
        } finally {
          btn.setDisabled(false).setButtonText("Show vault stats");
        }
      })
    );
    new import_obsidian4.Setting(el).setName("Penalty folders").setDesc("Comma-separated folder names whose links don't count toward connectivity").addText(
      (text) => text.setValue(this.plugin.settings.connectivityPenaltyFolders).onChange(async (val) => {
        this.plugin.settings.connectivityPenaltyFolders = val;
        await this.plugin.saveSettings();
        invalidateConnectivity();
      })
    );
    el.createEl("h4", { text: "Apply connectivity color to..." });
    el.createEl("p", {
      text: "Per-surface toggles let you keep connectivity coloring where it's ambient (file explorer) and drop it where it competes (note title).",
      cls: "setting-item-description"
    });
    for (const meta of CONNECTIVITY_SURFACES) {
      new import_obsidian4.Setting(el).setName(meta.name).setDesc(meta.desc).addToggle(
        (toggle) => toggle.setValue(this.plugin.settings.connectivityToggles[meta.key]).onChange(async (val) => {
          this.plugin.settings.connectivityToggles = {
            ...this.plugin.settings.connectivityToggles,
            [meta.key]: val
          };
          await this.plugin.saveSettings();
          this.plugin.decorateFileExplorer();
          this.plugin.decorateOpenTabs();
        })
      );
    }
    el.createEl("h3", { text: "Graph Banner" });
    el.createEl("p", {
      text: "Display a local-graph view at the top of each note (ported from ras0q/obsidian-graph-banner). Reload the app after toggling.",
      cls: "setting-item-description"
    });
    new import_obsidian4.Setting(el).setName("Enable graph banner").setDesc("When on, each note gets a local-graph banner just under its title.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.graphBanner.enable).onChange(async (val) => {
        this.plugin.settings.graphBanner = { ...this.plugin.settings.graphBanner, enable: val };
        await this.plugin.saveSettings();
        new import_obsidian4.Notice("Graph banner toggled \u2014 reload the app to apply.");
      })
    );
    new import_obsidian4.Setting(el).setName("Lazy render (default on)").setDesc(
      "When on, no graph is rendered until you click the 'Show graph' button in the note header. Much faster on large vaults. Turn off for eager auto-render on every note open."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.graphBanner.lazyRender).onChange(async (val) => {
        this.plugin.settings.graphBanner = { ...this.plugin.settings.graphBanner, lazyRender: val };
        await this.plugin.saveSettings();
        new import_obsidian4.Notice("Lazy render toggled \u2014 reload the app to apply.");
      })
    );
    new import_obsidian4.Setting(el).setName("Ignored path pattern").setDesc(
      "Manage notes which do not display the graph banner. This pattern follows .gitignore spec."
    ).addTextArea(
      (ta) => ta.setPlaceholder("ignored-path.md\n/ignored-dir\n!/ignored-dir/not-ignored-path.md").setValue(this.plugin.settings.graphBanner.ignore.join("\n")).onChange(async (val) => {
        this.plugin.settings.graphBanner = {
          ...this.plugin.settings.graphBanner,
          ignore: val.split("\n")
        };
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian4.Setting(el).setName("Advanced: Time [ms] to remove the graph leaf for the banner").setDesc(
      "This plugin temporarily creates a local graph leaf to display in the banner. If set to 0ms, the leaf is immediately erased. Reload the app to apply."
    ).addText(
      (text) => text.setPlaceholder("100").setValue(String(this.plugin.settings.graphBanner.timeToRemoveLeaf)).onChange(async (val) => {
        const n = Number(val);
        if (val === "" || Number.isNaN(n) || n < 0) {
          new import_obsidian4.Notice("Please specify a valid number.");
          return;
        }
        this.plugin.settings.graphBanner = {
          ...this.plugin.settings.graphBanner,
          timeToRemoveLeaf: n
        };
        await this.plugin.saveSettings();
      })
    );
    el.createEl("h3", { text: "Icon Library" });
    new import_obsidian4.Setting(el).setName("Rebuild icon bundle").setDesc(
      "Rescan .obsidian/icons/customize-icons/ and regenerate icons-bundle.json. Run this after dropping new SVGs into the icons folder (or after Dropbox syncs new icons from another machine)."
    ).addButton(
      (btn) => btn.setButtonText("Rebuild").setCta().onClick(async () => {
        btn.setDisabled(true).setButtonText("Rebuilding...");
        try {
          const count = await this.plugin.rebuildIconBundle();
          new import_obsidian4.Notice(`Icon bundle rebuilt (${count} icons).`);
        } catch (e) {
          new import_obsidian4.Notice("Rebuild failed \u2014 check console.");
          console.error(e);
        } finally {
          btn.setDisabled(false).setButtonText("Rebuild");
        }
      })
    );
    el.createEl("h3", { text: "Folder Icon Assignments" });
    el.createEl("p", {
      text: "Set an icon for each folder. Files inside inherit the icon. Subfolders can override.",
      cls: "setting-item-description"
    });
    this.renderFolderList(el);
  }
  async renderFolderList(containerEl) {
    const foldersDiv = containerEl.createDiv({ cls: "ci-folder-list" });
    const allFolders = [];
    const rootFolder = this.app.vault.getRoot();
    const walkFolders = (folder, depth) => {
      if (folder.path === "/") {
        for (const child of folder.children || []) {
          if (child instanceof import_obsidian4.TFolder)
            walkFolders(child, 0);
        }
        return;
      }
      allFolders.push({ path: folder.path, name: folder.name, depth });
      for (const child of folder.children || []) {
        if (child instanceof import_obsidian4.TFolder)
          walkFolders(child, depth + 1);
      }
    };
    walkFolders(rootFolder, 0);
    allFolders.sort((a, b) => a.path.localeCompare(b.path));
    const displayFolders = allFolders.filter((f) => f.depth <= 1 && !f.path.startsWith("."));
    for (const folder of displayFolders) {
      const row = foldersDiv.createDiv({ cls: "ci-folder-assignment" });
      const nameEl = row.createDiv({
        cls: "ci-folder-name" + (folder.depth > 0 ? " ci-subfolder" : "")
      });
      nameEl.textContent = folder.depth > 0 ? "  \u2514 " + folder.name : folder.name;
      const currentIcon = this.plugin.settings.folderIcons[folder.path];
      const previewEl = row.createDiv({ cls: "ci-folder-icon-preview" });
      if (currentIcon) {
        await this.renderIconPreview(previewEl, currentIcon.icon, currentIcon.color);
      }
      const iconInput = row.createEl("input", {
        type: "text",
        placeholder: "Icon ID or emoji",
        value: currentIcon ? currentIcon.icon : "",
        cls: "ci-icon-input"
      });
      iconInput.style.width = "120px";
      iconInput.style.fontSize = "12px";
      const browseBtn = row.createEl("button", { text: "\u{1F50D}" });
      browseBtn.style.fontSize = "14px";
      browseBtn.style.padding = "2px 6px";
      browseBtn.style.cursor = "pointer";
      browseBtn.setAttribute("title", "Browse icons");
      const colorInput = row.createEl("input", {
        type: "color",
        value: currentIcon ? currentIcon.color || this.plugin.settings.defaultIconColor : this.plugin.settings.defaultIconColor
      });
      colorInput.style.width = "32px";
      colorInput.style.height = "28px";
      colorInput.style.padding = "0";
      colorInput.style.border = "none";
      colorInput.style.cursor = "pointer";
      const clearBtn = row.createEl("button", { text: "\u2715" });
      clearBtn.style.fontSize = "11px";
      clearBtn.style.padding = "2px 6px";
      clearBtn.style.cursor = "pointer";
      const folderPath = folder.path;
      const plugin = this.plugin;
      const self = this;
      browseBtn.addEventListener("click", () => {
        const modal = new IconPickerModal(plugin.app, plugin, async (selectedIcon) => {
          iconInput.value = selectedIcon;
          const colorVal = colorInput.value;
          plugin.settings.folderIcons[folderPath] = { icon: selectedIcon, color: colorVal };
          await plugin.saveSettings();
          previewEl.empty();
          await self.renderIconPreview(previewEl, selectedIcon, colorVal);
          plugin.decorateFileExplorer();
          plugin.decorateOpenTabs();
        });
        modal.open();
      });
      const saveIcon = async () => {
        const iconVal = iconInput.value.trim();
        const colorVal = colorInput.value;
        if (iconVal) {
          plugin.settings.folderIcons[folderPath] = { icon: iconVal, color: colorVal };
        } else {
          delete plugin.settings.folderIcons[folderPath];
        }
        await plugin.saveSettings();
        previewEl.empty();
        if (iconVal) {
          await self.renderIconPreview(previewEl, iconVal, colorVal);
        }
        plugin.decorateFileExplorer();
        plugin.decorateOpenTabs();
      };
      iconInput.addEventListener("change", saveIcon);
      colorInput.addEventListener("input", saveIcon);
      clearBtn.addEventListener("click", async () => {
        iconInput.value = "";
        delete plugin.settings.folderIcons[folderPath];
        await plugin.saveSettings();
        previewEl.empty();
        plugin.decorateFileExplorer();
        plugin.decorateOpenTabs();
      });
    }
  }
  async renderIconPreview(container, iconId, color) {
    const parsed = parseIconId(iconId);
    if (!parsed)
      return;
    if (parsed.type === "emoji") {
      container.appendChild(createEmojiElement(parsed.emoji));
    } else {
      const svg = await loadSvg(
        this.app.vault.adapter,
        this.plugin.settings.iconPacksPath,
        parsed.pack,
        parsed.name
      );
      if (svg) {
        container.appendChild(
          createIconElement(svg, color || this.plugin.settings.defaultIconColor, null)
        );
      }
    }
  }
};

// src/main.ts
var CustomizeIconsPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this._explorerTimer = null;
    this._decorating = false;
    this._basesObservers = /* @__PURE__ */ new Map();
    this.graphBannerManager = null;
    this.errorLogger = null;
  }
  async onload() {
    await this.loadSettings();
    this.errorLogger = new ErrorLogger(this.app);
    await this.errorLogger.install();
    setBundledIcons(await this.loadBundledIcons());
    if (Object.keys(this.settings.folderIcons).length === 0) {
      this.settings.folderIcons = Object.assign({}, DEFAULT_FOLDER_ICONS);
      await this.saveSettings();
    }
    await buildIconIndex(this.app.vault.adapter, this.settings.iconPacksPath);
    if (this.settings.enableLivePreviewLinkIcons) {
      await this.warmLivePreviewCache();
    }
    this.addSettingTab(new CustomizeIconsSettingTab(this.app, this));
    this.registerMarkdownPostProcessor((el, ctx) => {
      processReadingModeLinks(this, el, ctx);
    });
    this.app.workspace.onLayoutReady(() => {
      this.decorateFileExplorer();
      this.decorateOpenTabs();
      this.decorateBases();
    });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.decorateOpenTabs();
        this.decorateBases();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.decorateOpenTabs();
        this.addTitleIcon(leaf);
        this.decorateBases();
      })
    );
    this.registerEvent(this.app.vault.on("create", () => this.debouncedDecorate()));
    this.registerEvent(this.app.vault.on("delete", () => this.debouncedDecorate()));
    this.registerEvent(this.app.vault.on("rename", () => this.debouncedDecorate()));
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        invalidateQualityFor(file.path);
        invalidateConnectivity();
        this.debouncedDecorate();
      })
    );
    this.registerEditorExtension([
      createEditorExtension(this),
      createLivePreviewExtension(this)
    ]);
    this.app.workspace.onLayoutReady(() => {
      syncColorGroupsToGraphPlugin(this.app, this.settings);
    });
    if (this.settings.graphBanner.enable) {
      document.querySelectorAll(".graph-banner-content, .graph-banner-placeholder").forEach((el) => {
        var _a;
        return (_a = el.parentElement) == null ? void 0 : _a.removeChild(el);
      });
      this.graphBannerManager = new GraphBannerManager(this.settings.graphBanner.timeToRemoveLeaf);
      const handleView = async (view) => {
        if (!view || !view.file || view.file.extension !== "md")
          return;
        if (this.settings.graphBanner.lazyRender) {
          await this.showGraphPlaceholder(view);
        } else {
          await this.placeGraphBanner(view);
        }
      };
      this.registerEvent(
        this.app.workspace.on("file-open", async (file) => {
          if (!file || file.extension !== "md")
            return;
          const view = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
          if (!view || view.file !== file)
            return;
          await handleView(view);
        })
      );
      this.registerEvent(
        this.app.workspace.on("layout-change", async () => {
          const v = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
          await handleView(v);
        })
      );
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", async (leaf) => {
          if (!leaf)
            return;
          const v = leaf.view;
          await handleView(v);
        })
      );
      this.app.workspace.onLayoutReady(async () => {
        for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
          const v = leaf.view;
          await handleView(v);
        }
      });
    }
    new import_obsidian5.Notice("Customize Icons v1.7.10 loaded (icon+text no-wrap glue)");
  }
  onunload() {
    if (this.errorLogger) {
      this.errorLogger.uninstall();
      this.errorLogger = null;
    }
    if (this.graphBannerManager) {
      this.graphBannerManager.detachAll();
      this.graphBannerManager = null;
    }
    document.querySelectorAll(".graph-banner-content").forEach((el) => {
      var _a;
      return (_a = el.parentElement) == null ? void 0 : _a.removeChild(el);
    });
    GraphBannerPlaceholder.removeAll();
    if (this._basesObservers) {
      this._basesObservers.forEach((obs) => obs.disconnect());
      this._basesObservers.clear();
    }
    document.querySelectorAll(
      ".customize-icons-explorer-icon, .customize-icons-tab-icon, .customize-icons-title-icon, .customize-icons-link-icon"
    ).forEach((el) => el.remove());
    document.querySelectorAll(".internal-link[data-ci-processed]").forEach((el) => el.removeAttribute("data-ci-processed"));
  }
  getQualityColorInfo(filePath, surface = "links") {
    if (this.settings.enableQualityColoring) {
      const score = getQualityScore(this.app, filePath);
      if (score !== null && score >= this.settings.qualityHighThreshold) {
        return { color: this.settings.qualityHighColor, cssClass: "ci-quality-high" };
      }
    }
    if (this.settings.enableConnectivityColoring && this.settings.connectivityToggles[surface] !== false) {
      const penaltyList = this.settings.connectivityPenaltyFolders.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      const inPenalty = penaltyList.some((p) => filePath.startsWith(p));
      if (!inPenalty) {
        if (!isConnectivityBuilt())
          buildConnectivityScores(this.app, this.settings);
        const conn = getConnectivityScore(filePath);
        if (conn >= this.settings.connectivityThreshold) {
          return { color: this.settings.connectivityColor, cssClass: "ci-connectivity" };
        }
      }
    }
    if (this.settings.enableQualityColoring) {
      const score = getQualityScore(this.app, filePath);
      if (score !== null) {
        return { color: this.settings.qualityExistsColor, cssClass: "ci-quality-exists" };
      }
    }
    return { color: null, cssClass: null };
  }
  // Thin instance-method wrappers so decorator modules can call plugin.decorateX()
  // matching the v1.6.5 shape.
  decorateFileExplorer() {
    return decorateFileExplorer(this);
  }
  decorateOpenTabs() {
    return decorateOpenTabs(this);
  }
  addTitleIcon(leaf) {
    return addTitleIcon(this, leaf);
  }
  decorateBases() {
    return decorateBases(this);
  }
  debouncedDecorate() {
    if (this._explorerTimer)
      clearTimeout(this._explorerTimer);
    this._explorerTimer = setTimeout(() => {
      this.decorateFileExplorer();
      this.decorateOpenTabs();
      document.querySelectorAll(".internal-link[data-ci-processed]").forEach((el) => el.removeAttribute("data-ci-processed"));
      document.querySelectorAll(".bases-view .customize-icons-link-icon").forEach((el) => el.remove());
      this.decorateBases();
    }, 500);
  }
  async loadBundledIcons() {
    const bundlePath = ".obsidian/plugins/customize-icons/icons-bundle.json";
    try {
      if (await this.app.vault.adapter.exists(bundlePath)) {
        const data = await this.app.vault.adapter.read(bundlePath);
        return JSON.parse(data);
      }
    } catch (e) {
    }
    const bundle = {};
    const iconsPath = this.settings.iconPacksPath + "/customize-icons";
    try {
      const listing = await this.app.vault.adapter.list(iconsPath);
      if (listing && listing.files) {
        for (const filePath of listing.files) {
          if (filePath.endsWith(".svg")) {
            const id = filePath.split("/").pop().replace(".svg", "");
            const svg = await this.app.vault.adapter.read(filePath);
            if (svg && svg.length > 50)
              bundle[id] = svg;
          }
        }
      }
    } catch (e) {
    }
    if (Object.keys(bundle).length > 0) {
      try {
        await this.app.vault.adapter.write(bundlePath, JSON.stringify(bundle));
      } catch (e) {
      }
    }
    return bundle;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async warmLivePreviewCache() {
    const seen = /* @__PURE__ */ new Set();
    for (const key in this.settings.folderIcons) {
      const parsed = parseIconId(this.settings.folderIcons[key].icon);
      if (!parsed || parsed.type !== "svg")
        continue;
      const dedup = parsed.pack + "/" + parsed.name;
      if (seen.has(dedup))
        continue;
      seen.add(dedup);
      await warmSvg(
        this.app.vault.adapter,
        this.settings.iconPacksPath,
        parsed.pack,
        parsed.name
      );
    }
  }
  async placeGraphBanner(view, opts = {}) {
    if (!this.graphBannerManager)
      return;
    const matcher = new IgnoreMatcher().add(this.settings.graphBanner.ignore);
    const colorGroups = syncColorGroupsToGraphPlugin(this.app, this.settings);
    await this.graphBannerManager.placeGraphView(this.app, view, matcher, {
      ...opts,
      colorGroups
    });
  }
  /**
   * Lazy-mode entry point. Behavior by state:
   *   - Ignored path: remove both placeholder and any banner in the pane.
   *   - Banner already mounted FOR THIS FILE: leave it alone (user revealed
   *     it; a follow-up layout-change must not stomp their choice).
   *   - Banner mounted for a DIFFERENT file: detach it (previous file), then
   *     insert placeholder for the new file.
   *   - No banner: ensure placeholder is present.
   */
  async showGraphPlaceholder(view) {
    var _a;
    if (!this.graphBannerManager)
      return;
    const paneEl = view.containerEl;
    const filePath = (_a = view.file) == null ? void 0 : _a.path;
    if (!filePath)
      return;
    const matcher = new IgnoreMatcher().add(this.settings.graphBanner.ignore);
    if (matcher.test(filePath)) {
      GraphBannerPlaceholder.removeFrom(view);
      this.graphBannerManager.detachInPane(paneEl);
      return;
    }
    if (this.graphBannerManager.paneShowsFile(paneEl, filePath)) {
      GraphBannerPlaceholder.removeFrom(view);
      return;
    }
    if (paneEl.querySelector(".graph-banner-content")) {
      this.graphBannerManager.detachInPane(paneEl);
    }
    await GraphBannerPlaceholder.ensureIn(view, () => {
      void this.placeGraphBanner(view, { forceFresh: true });
    });
  }
  async rebuildIconBundle() {
    const bundlePath = ".obsidian/plugins/customize-icons/icons-bundle.json";
    const bundle = {};
    const iconsPath = this.settings.iconPacksPath + "/customize-icons";
    try {
      const listing = await this.app.vault.adapter.list(iconsPath);
      if (listing && listing.files) {
        for (const filePath of listing.files) {
          if (!filePath.endsWith(".svg"))
            continue;
          const id = filePath.split("/").pop().replace(".svg", "");
          const svg = await this.app.vault.adapter.read(filePath);
          if (svg && svg.length > 50)
            bundle[id] = svg;
        }
      }
    } catch (e) {
      console.error("[customize-icons] rebuildIconBundle scan failed", e);
      throw e;
    }
    await this.app.vault.adapter.write(bundlePath, JSON.stringify(bundle));
    setBundledIcons(bundle);
    if (this.settings.enableLivePreviewLinkIcons)
      await this.warmLivePreviewCache();
    return Object.keys(bundle).length;
  }
};
