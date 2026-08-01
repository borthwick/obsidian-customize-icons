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
  timeToRemoveLeaf: 100
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
  const parsed = parseIconId(iconConfig.icon);
  if (!parsed)
    return;
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
    this.setupLeafPromise = this.setupLeaf(timeToRemoveLeaf);
    const content = this.leaf.view.containerEl.find(".view-content");
    this.node = content;
    this.setupNode();
  }
  async setupLeaf(timeToRemoveLeaf) {
    await this.leaf.setViewState({ type: "localgraph" });
    const removeChild = () => this.leaf.parent.removeChild(this.leaf);
    if (timeToRemoveLeaf > 0)
      setTimeout(removeChild, timeToRemoveLeaf);
    else
      removeChild();
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
  isActive() {
    return this.node.dataset.interactive === "true";
  }
  setActive(active) {
    this.node.dataset.interactive = active ? "true" : "false";
  }
  async placeTo(view) {
    var _a, _b;
    await this.setupLeafPromise;
    await this.leaf.setViewState({
      type: "localgraph",
      state: { file: (_a = view.file) == null ? void 0 : _a.path }
    });
    this.leaf.setGroup((_b = view.file) == null ? void 0 : _b.path);
    const mode = view.getMode();
    const container = view.containerEl.find(`.markdown-${mode}-view`);
    if (!container)
      return;
    if (this.isDescendantOf(container))
      return;
    const inlineTitle = container.querySelector(".inline-title");
    if (!inlineTitle)
      return;
    const parent = inlineTitle.parentElement;
    if (!parent)
      throw new Error("Failed to get note header");
    parent.insertBefore(this.node, inlineTitle.nextSibling);
  }
  isDescendantOf(el) {
    return el.contains(this.node);
  }
  setVisibility(visible) {
    this.node.toggleClass("hidden", !visible);
  }
  detach() {
    this.leaf.detach();
    this.node.removeClass(_GraphBannerView.nodeClass);
  }
};
var GraphBannerView = _GraphBannerView;
GraphBannerView.nodeClass = "graph-banner-content";
GraphBannerView.overlayNodeClass = "graph-banner-overlay";

// src/graph-banner/banner-manager.ts
var GraphBannerManager = class {
  constructor(timeToRemoveLeaf) {
    this.graphViews = [];
    this.timeToRemoveLeaf = timeToRemoveLeaf;
  }
  async placeGraphView(app, view, ignoreMatcher) {
    var _a;
    const filePath = (_a = view.file) == null ? void 0 : _a.path;
    if (!filePath)
      return;
    const ignored = ignoreMatcher.test(filePath);
    const bannerView = this.findAvailableGraphView(app, view);
    bannerView.setVisibility(!ignored);
    await bannerView.placeTo(view);
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
    const bundled = getBundledIcons();
    if (bundled) {
      for (const id in bundled) {
        this.allIcons.push({ id, svg: bundled[id] });
      }
    } else {
      const iconsPath = this.plugin.settings.iconPacksPath + "/customize-icons";
      try {
        const listing = await this.app.vault.adapter.list(iconsPath);
        if (listing && listing.files) {
          for (const filePath of listing.files) {
            if (filePath.endsWith(".svg")) {
              const fileName = filePath.split("/").pop().replace(".svg", "");
              const svgContent = await this.app.vault.adapter.read(filePath);
              if (svgContent && svgContent.length > 50) {
                this.allIcons.push({ id: fileName, svg: svgContent });
              }
            }
          }
        }
      } catch (e) {
      }
    }
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
      "Score at or above which the high color is used. Score = (inbound links * 2) + (bidirectional links * 3). Your vault median is 6, 80th percentile is 12."
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
  }
  async onload() {
    await this.loadSettings();
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
    if (this.settings.graphBanner.enable) {
      this.graphBannerManager = new GraphBannerManager(this.settings.graphBanner.timeToRemoveLeaf);
      this.registerEvent(
        this.app.workspace.on("file-open", async (file) => {
          if (!file || file.extension !== "md")
            return;
          const view = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
          if (!view || view.file !== file)
            return;
          await this.placeGraphBanner(view);
        })
      );
      this.registerEvent(
        this.app.workspace.on("layout-change", async () => {
          const view = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
          if (view)
            await this.placeGraphBanner(view);
        })
      );
      this.app.workspace.onLayoutReady(async () => {
        for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
          await this.placeGraphBanner(leaf.view);
        }
      });
    }
    new import_obsidian5.Notice("Customize Icons v1.7.0 loaded");
  }
  onunload() {
    if (this.graphBannerManager) {
      this.graphBannerManager.detachAll();
      this.graphBannerManager = null;
    }
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
  async placeGraphBanner(view) {
    if (!this.graphBannerManager)
      return;
    const matcher = new IgnoreMatcher().add(this.settings.graphBanner.ignore);
    await this.graphBannerManager.placeGraphView(this.app, view, matcher);
  }
};
