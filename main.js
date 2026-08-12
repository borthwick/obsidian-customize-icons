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

// icons-bundle.json
var icons_bundle_default = { BoBxsFilm: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M19 4v1h-2V3H7v2H5V3H3v18h2v-2h2v2h10v-2h2v2h2V3h-2v1zM5 7h2v2H5V7zm0 4h2v2H5v-2zm0 6v-2h2v2H5zm12 0v-2h2v2h-2zm2-4h-2v-2h2v2zm-2-4V7h2v2h-2z"/></svg>', BoBxsMessageRoundedX: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 5.589 2 10c0 2.907 1.897 5.515 5 6.934V22l5.34-4.005C17.697 17.853 22 14.32 22 10c0-4.411-4.486-8-10-8zm3.707 10.293-1.414 1.414L12 11.414l-2.293 2.293-1.414-1.414L10.586 10 8.293 7.707l1.414-1.414L12 8.586l2.293-2.293 1.414 1.414L13.414 10l2.293 2.293z"></path></svg>', Book: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Interface / Book"><path id="Vector" d="M5 19.5002V6.2002C5 5.08009 5 4.51962 5.21799 4.0918C5.40973 3.71547 5.71547 3.40973 6.0918 3.21799C6.51962 3 7.08009 3 8.2002 3H17.4002C17.9602 3 18.2407 3 18.4546 3.10899C18.6427 3.20487 18.7948 3.35774 18.8906 3.5459C18.9996 3.75981 19 4.04005 19 4.6001V16.4001C19 16.9601 18.9996 17.2398 18.8906 17.4537C18.7948 17.6419 18.6429 17.7952 18.4548 17.8911C18.2411 18 17.961 18 17.402 18H7.25C6.00736 18 5 19.0074 5 20.25C5 20.6642 5.33579 21 5.75 21H16.402C16.961 21 17.2411 21 17.4548 20.8911C17.6429 20.7952 17.7948 20.642 17.8906 20.4538C17.9996 20.2399 18 19.9601 18 19.4V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', Book24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.75A.75.75 0 0 1 .75 3h7.497c1.566 0 2.945.8 3.751 2.014A4.495 4.495 0 0 1 15.75 3h7.5a.75.75 0 0 1 .75.75v15.063a.752.752 0 0 1-.755.75l-7.682-.052a3 3 0 0 0-2.142.878l-.89.891a.75.75 0 0 1-1.061 0l-.902-.901a2.996 2.996 0 0 0-2.121-.879H.75a.75.75 0 0 1-.75-.75Zm12.75 15.232a4.503 4.503 0 0 1 2.823-.971l6.927.047V4.5h-6.75a3 3 0 0 0-3 3ZM11.247 7.497a3 3 0 0 0-3-2.997H1.5V18h6.947c1.018 0 2.006.346 2.803.98Z"></path></svg>', Bookmark: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Interface / Bookmark"><path id="Vector" d="M6 7.2002V16.6854C6 18.0464 6 18.7268 6.20412 19.1433C6.58245 19.9151 7.41157 20.3588 8.26367 20.2454C8.7234 20.1842 9.28964 19.8067 10.4221 19.0518L10.4248 19.0499C10.8737 18.7507 11.0981 18.6011 11.333 18.5181C11.7642 18.3656 12.2348 18.3656 12.666 18.5181C12.9013 18.6012 13.1266 18.7515 13.5773 19.0519C14.7098 19.8069 15.2767 20.1841 15.7364 20.2452C16.5885 20.3586 17.4176 19.9151 17.7959 19.1433C18 18.7269 18 18.0462 18 16.6854V7.19691C18 6.07899 18 5.5192 17.7822 5.0918C17.5905 4.71547 17.2837 4.40973 16.9074 4.21799C16.4796 4 15.9203 4 14.8002 4H9.2002C8.08009 4 7.51962 4 7.0918 4.21799C6.71547 4.40973 6.40973 4.71547 6.21799 5.0918C6 5.51962 6 6.08009 6 7.2002Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', BxBxsMessageRoundedX: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 5.589 2 10c0 2.907 1.897 5.515 5 6.934V22l5.34-4.005C17.697 17.853 22 14.32 22 10c0-4.411-4.486-8-10-8zm3.707 10.293-1.414 1.414L12 11.414l-2.293 2.293-1.414-1.414L10.586 10 8.293 7.707l1.414-1.414L12 8.586l2.293-2.293 1.414 1.414L13.414 10l2.293 2.293z"></path></svg>', Calendar24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M6.75 0a.75.75 0 0 1 .75.75V3h9V.75a.75.75 0 0 1 1.5 0V3h2.75c.966 0 1.75.784 1.75 1.75v16a1.75 1.75 0 0 1-1.75 1.75H3.25a1.75 1.75 0 0 1-1.75-1.75v-16C1.5 3.784 2.284 3 3.25 3H6V.75A.75.75 0 0 1 6.75 0ZM21 9.5H3v11.25c0 .138.112.25.25.25h17.5a.25.25 0 0 0 .25-.25Zm-17.75-5a.25.25 0 0 0-.25.25V8h18V4.75a.25.25 0 0 0-.25-.25Z"></path></svg>', CalendarWeek: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Calendar / Calendar_Week"><path id="Vector" d="M4 8H20M4 8V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2842 19.7822 18.9079C20 18.4805 20 17.9215 20 16.8036V8M4 8V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H8M20 8V7.19691C20 6.07899 20 5.5192 19.7822 5.0918C19.5905 4.71547 19.2837 4.40973 18.9074 4.21799C18.4796 4 17.9203 4 16.8002 4H16M8 4H16M8 4V2M16 4V2M16 12H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', CoBook: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Interface / Book"><path id="Vector" d="M5 19.5002V6.2002C5 5.08009 5 4.51962 5.21799 4.0918C5.40973 3.71547 5.71547 3.40973 6.0918 3.21799C6.51962 3 7.08009 3 8.2002 3H17.4002C17.9602 3 18.2407 3 18.4546 3.10899C18.6427 3.20487 18.7948 3.35774 18.8906 3.5459C18.9996 3.75981 19 4.04005 19 4.6001V16.4001C19 16.9601 18.9996 17.2398 18.8906 17.4537C18.7948 17.6419 18.6429 17.7952 18.4548 17.8911C18.2411 18 17.961 18 17.402 18H7.25C6.00736 18 5 19.0074 5 20.25C5 20.6642 5.33579 21 5.75 21H16.402C16.961 21 17.2411 21 17.4548 20.8911C17.6429 20.7952 17.7948 20.642 17.8906 20.4538C17.9996 20.2399 18 19.9601 18 19.4V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', CoBookmark: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Interface / Bookmark"><path id="Vector" d="M6 7.2002V16.6854C6 18.0464 6 18.7268 6.20412 19.1433C6.58245 19.9151 7.41157 20.3588 8.26367 20.2454C8.7234 20.1842 9.28964 19.8067 10.4221 19.0518L10.4248 19.0499C10.8737 18.7507 11.0981 18.6011 11.333 18.5181C11.7642 18.3656 12.2348 18.3656 12.666 18.5181C12.9013 18.6012 13.1266 18.7515 13.5773 19.0519C14.7098 19.8069 15.2767 20.1841 15.7364 20.2452C16.5885 20.3586 17.4176 19.9151 17.7959 19.1433C18 18.7269 18 18.0462 18 16.6854V7.19691C18 6.07899 18 5.5192 17.7822 5.0918C17.5905 4.71547 17.2837 4.40973 16.9074 4.21799C16.4796 4 15.9203 4 14.8002 4H9.2002C8.08009 4 7.51962 4 7.0918 4.21799C6.71547 4.40973 6.40973 4.71547 6.21799 5.0918C6 5.51962 6 6.08009 6 7.2002Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', CoCalendarWeek: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Calendar / Calendar_Week"><path id="Vector" d="M4 8H20M4 8V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2842 19.7822 18.9079C20 18.4805 20 17.9215 20 16.8036V8M4 8V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H8M20 8V7.19691C20 6.07899 20 5.5192 19.7822 5.0918C19.5905 4.71547 19.2837 4.40973 18.9074 4.21799C18.4796 4 17.9203 4 16.8002 4H16M8 4H16M8 4V2M16 4V2M16 12H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', CoNoteEdit: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="File / Note_Edit"><path id="Vector" d="M10.0002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V14M16 5L10 11V14H13L19 8M16 5L19 2L22 5L19 8M16 5L19 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', CoPuzzle: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Environment / Puzzle"><path id="Vector" d="M20 7H17.8486C17.3511 7 17 6.49751 17 6C17 4.34315 15.6569 3 14 3C12.3431 3 11 4.34315 11 6C11 6.49751 10.6488 7 10.1513 7H8C7.44771 7 7 7.44772 7 8V10.1513C7 10.6488 6.49751 11 6 11C4.34315 11 3 12.3431 3 14C3 15.6569 4.34315 17 6 17C6.49751 17 7 17.3511 7 17.8486V20C7 20.5523 7.44771 21 8 21L20 21C20.5523 21 21 20.5523 21 20V17.8486C21 17.3511 20.4975 17 20 17C18.3431 17 17 15.6569 17 14C17 12.3431 18.3431 11 20 11C20.4975 11 21 10.6488 21 10.1513L21 8C21 7.44772 20.5523 7 20 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', CoWifiNone: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="System / Wifi_None"><path id="Vector" d="M11 18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18C13 17.4477 12.5523 17 12 17C11.4477 17 11 17.4477 11 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', Database24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.25c2.487 0 4.773.402 6.466 1.079.844.337 1.577.758 2.112 1.264.536.507.922 1.151.922 1.907v12.987l-.026.013h.026c0 .756-.386 1.4-.922 1.907-.535.506-1.268.927-2.112 1.264-1.693.677-3.979 1.079-6.466 1.079s-4.774-.402-6.466-1.079c-.844-.337-1.577-.758-2.112-1.264C2.886 19.9 2.5 19.256 2.5 18.5h.026l-.026-.013V5.5c0-.756.386-1.4.922-1.907.535-.506 1.268-.927 2.112-1.264C7.226 1.652 9.513 1.25 12 1.25ZM4 14.371v4.116l-.013.013H4c0 .211.103.487.453.817.351.332.898.666 1.638.962 1.475.589 3.564.971 5.909.971 2.345 0 4.434-.381 5.909-.971.739-.296 1.288-.63 1.638-.962.349-.33.453-.607.453-.817h.013L20 18.487v-4.116a7.85 7.85 0 0 1-1.534.8c-1.693.677-3.979 1.079-6.466 1.079s-4.774-.402-6.466-1.079a7.843 7.843 0 0 1-1.534-.8ZM20 12V7.871a7.85 7.85 0 0 1-1.534.8C16.773 9.348 14.487 9.75 12 9.75s-4.774-.402-6.466-1.079A7.85 7.85 0 0 1 4 7.871V12c0 .21.104.487.453.817.35.332.899.666 1.638.961 1.475.59 3.564.972 5.909.972 2.345 0 4.434-.382 5.909-.972.74-.295 1.287-.629 1.638-.96.35-.33.453-.607.453-.818ZM4 5.5c0 .211.103.487.453.817.351.332.898.666 1.638.962 1.475.589 3.564.971 5.909.971 2.345 0 4.434-.381 5.909-.971.739-.296 1.288-.63 1.638-.962.349-.33.453-.607.453-.817 0-.211-.103-.487-.453-.817-.351-.332-.898-.666-1.638-.962-1.475-.589-3.564-.971-5.909-.971-2.345 0-4.434.381-5.909.971-.739.296-1.288.63-1.638.962C4.104 5.013 4 5.29 4 5.5Z"></path></svg>', Dot: '<svg width="16px" height="16px" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="currentColor"></path></svg>', Dot24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-1.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"></path></svg>', Ear: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-ear"><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"></path><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"></path></svg>', FaMasksTheater: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor" width="16px" height="16px"><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M74.6 373.2c41.7 36.1 108 82.5 166.1 73.7c6.1-.9 12.1-2.5 18-4.5c-9.2-12.3-17.3-24.4-24.2-35.4c-21.9-35-28.8-75.2-25.9-113.6c-20.6 4.1-39.2 13-54.7 25.4c-6.5 5.2-16.3 1.3-14.8-7c6.4-33.5 33-60.9 68.2-66.3c2.6-.4 5.3-.7 7.9-.8l19.4-131.3c2-13.8 8-32.7 25-45.9C278.2 53.2 310.5 37 363.2 32.2c-.8-.7-1.6-1.4-2.4-2.1C340.6 14.5 288.4-11.5 175.7 5.6S20.5 63 5.7 83.9C0 91.9-.8 102 .6 111.8L24.8 276.1c5.5 37.3 21.5 72.6 49.8 97.2zm87.7-219.6c4.4-3.1 10.8-2 11.8 3.3c.1 .5 .2 1.1 .3 1.6c3.2 21.8-11.6 42-33.1 45.3s-41.5-11.8-44.7-33.5c-.1-.5-.1-1.1-.2-1.6c-.6-5.4 5.2-8.4 10.3-6.7c9 3 18.8 3.9 28.7 2.4s19.1-5.3 26.8-10.8zM261.6 390c29.4 46.9 79.5 110.9 137.6 119.7s124.5-37.5 166.1-73.7c28.3-24.5 44.3-59.8 49.8-97.2l24.2-164.3c1.4-9.8 .6-19.9-5.1-27.9c-14.8-20.9-57.3-61.2-170-78.3S299.4 77.2 279.2 92.8c-7.8 6-11.5 15.4-12.9 25.2L242.1 282.3c-5.5 37.3-.4 75.8 19.6 107.7zM404.5 235.3c-7.7-5.5-16.8-9.3-26.8-10.8s-19.8-.6-28.7 2.4c-5.1 1.7-10.9-1.3-10.3-6.7c.1-.5 .1-1.1 .2-1.6c3.2-21.8 23.2-36.8 44.7-33.5s36.3 23.5 33.1 45.3c-.1 .5-.2 1.1-.3 1.6c-1 5.3-7.4 6.4-11.8 3.3zm136.2 15.5c-1 5.3-7.4 6.4-11.8 3.3c-7.7-5.5-16.8-9.3-26.8-10.8s-19.8-.6-28.7 2.4c-5.1 1.7-10.9-1.3-10.3-6.7c.1-.5 .1-1.1 .2-1.6c3.2-21.8 23.2-36.8 44.7-33.5s36.3 23.5 33.1 45.3c-.1 .5-.2 1.1-.3 1.6zM530 350.2c-19.6 44.7-66.8 72.5-116.8 64.9s-87.1-48.2-93-96.7c-1-8.3 8.9-12.1 15.2-6.7c23.9 20.8 53.6 35.3 87 40.3s66.1 .1 94.9-12.8c7.6-3.4 16 3.2 12.6 10.9z"></path></svg>', FaQuestion: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor" width="16px" height="16px"><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M80 160c0-35.3 28.7-64 64-64h32c35.3 0 64 28.7 64 64v3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74V320c0 17.7 14.3 32 32 32s32-14.3 32-32v-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7V160c0-70.7-57.3-128-128-128H144C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"></path></svg>', FeBook: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>', FeScissors: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>', HexagonLetterG: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-hexagon-letter-g"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M13.666 1.429l6.75 3.98l.096 .063l.093 .078l.106 .074a3.22 3.22 0 0 1 1.284 2.39l.005 .204v7.284c0 1.175 -.643 2.256 -1.623 2.793l-6.804 4.302c-.98 .538 -2.166 .538 -3.2 -.032l-6.695 -4.237a3.23 3.23 0 0 1 -1.678 -2.826v-7.285c0 -1.106 .57 -2.128 1.476 -2.705l6.95 -4.098c1 -.552 2.214 -.552 3.24 .015m.334 5.571h-2a3 3 0 0 0 -3 3v4a3 3 0 0 0 3 3h2a1 1 0 0 0 1 -1v-4a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1l.007 .117a1 1 0 0 0 .993 .883v2h-1a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2a1 1 0 0 0 0 -2"></path></svg>', IbDot: '<svg width="16px" height="16px" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="currentColor"></path></svg>', IbTwitter: '<svg width="16px" height="16px" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.596 5.441c-.45 0-1.137.584-2.003.754A3.79 3.79 0 0 0 15.826 5a3.789 3.789 0 0 0-3.692 4.65c-4.018 0-5.404-3.727-6.79-3.727-1.385 0-1.385 1.614-1.385 2.307 0 2.42.13 4.856 4.455 7.358-1.579 1.237-4.916 1.87-5.378 2.71C2.574 19.14 6.706 20 8.845 20c6.512 0 11.132-3.423 10.85-9.706 1.804-2.206 1.353-4.853.901-4.853z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path></svg>', LiAlbum: '<!-- @license lucide-static v1.8.0 - ISC -->\n<svg\n  class="lucide lucide-album"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />\n  <polyline points="11 3 11 11 14 8 17 11 17 3" />\n</svg>', LiBook: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-book"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"></path></svg>', LiBookDown: '<!-- @license lucide-static v1.8.0 - ISC -->\n<svg\n  class="lucide lucide-book-down"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 13V7" />\n  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />\n  <path d="m9 10 3 3 3-3" />\n</svg>', LiBookmark: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-bookmark"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path></svg>', LiCalendarDays: '<!-- @license lucide-static v1.8.0 - ISC -->\n<svg\n  class="lucide lucide-calendar-days"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M8 2v4" />\n  <path d="M16 2v4" />\n  <rect width="18" height="18" x="3" y="4" rx="2" />\n  <path d="M3 10h18" />\n  <path d="M8 14h.01" />\n  <path d="M12 14h.01" />\n  <path d="M16 14h.01" />\n  <path d="M8 18h.01" />\n  <path d="M12 18h.01" />\n  <path d="M16 18h.01" />\n</svg>', LiEar: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-ear"><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"></path><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"></path></svg>', LiImage: '<!-- @license lucide-static v1.8.0 - ISC -->\n<svg\n  class="lucide lucide-image"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />\n  <circle cx="9" cy="9" r="2" />\n  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />\n</svg>', LiPencilLine: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path><path d="m15 5 3 3"></path></svg>', LiRocket: '<!-- @license lucide-static v1.8.0 - ISC -->\n<svg\n  class="lucide lucide-rocket"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />\n  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09" />\n  <path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" />\n  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" />\n</svg>', LiTwitter: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>', LiWaves: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path></svg>', MasksTheater: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor" width="16px" height="16px"><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M74.6 373.2c41.7 36.1 108 82.5 166.1 73.7c6.1-.9 12.1-2.5 18-4.5c-9.2-12.3-17.3-24.4-24.2-35.4c-21.9-35-28.8-75.2-25.9-113.6c-20.6 4.1-39.2 13-54.7 25.4c-6.5 5.2-16.3 1.3-14.8-7c6.4-33.5 33-60.9 68.2-66.3c2.6-.4 5.3-.7 7.9-.8l19.4-131.3c2-13.8 8-32.7 25-45.9C278.2 53.2 310.5 37 363.2 32.2c-.8-.7-1.6-1.4-2.4-2.1C340.6 14.5 288.4-11.5 175.7 5.6S20.5 63 5.7 83.9C0 91.9-.8 102 .6 111.8L24.8 276.1c5.5 37.3 21.5 72.6 49.8 97.2zm87.7-219.6c4.4-3.1 10.8-2 11.8 3.3c.1 .5 .2 1.1 .3 1.6c3.2 21.8-11.6 42-33.1 45.3s-41.5-11.8-44.7-33.5c-.1-.5-.1-1.1-.2-1.6c-.6-5.4 5.2-8.4 10.3-6.7c9 3 18.8 3.9 28.7 2.4s19.1-5.3 26.8-10.8zM261.6 390c29.4 46.9 79.5 110.9 137.6 119.7s124.5-37.5 166.1-73.7c28.3-24.5 44.3-59.8 49.8-97.2l24.2-164.3c1.4-9.8 .6-19.9-5.1-27.9c-14.8-20.9-57.3-61.2-170-78.3S299.4 77.2 279.2 92.8c-7.8 6-11.5 15.4-12.9 25.2L242.1 282.3c-5.5 37.3-.4 75.8 19.6 107.7zM404.5 235.3c-7.7-5.5-16.8-9.3-26.8-10.8s-19.8-.6-28.7 2.4c-5.1 1.7-10.9-1.3-10.3-6.7c.1-.5 .1-1.1 .2-1.6c3.2-21.8 23.2-36.8 44.7-33.5s36.3 23.5 33.1 45.3c-.1 .5-.2 1.1-.3 1.6c-1 5.3-7.4 6.4-11.8 3.3zm136.2 15.5c-1 5.3-7.4 6.4-11.8 3.3c-7.7-5.5-16.8-9.3-26.8-10.8s-19.8-.6-28.7 2.4c-5.1 1.7-10.9-1.3-10.3-6.7c.1-.5 .1-1.1 .2-1.6c3.2-21.8 23.2-36.8 44.7-33.5s36.3 23.5 33.1 45.3c-.1 .5-.2 1.1-.3 1.6zM530 350.2c-19.6 44.7-66.8 72.5-116.8 64.9s-87.1-48.2-93-96.7c-1-8.3 8.9-12.1 15.2-6.7c23.9 20.8 53.6 35.3 87 40.3s66.1 .1 94.9-12.8c7.6-3.4 16 3.2 12.6 10.9z"></path></svg>', NoteEdit: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="File / Note_Edit"><path id="Vector" d="M10.0002 4H7.2002C6.08009 4 5.51962 4 5.0918 4.21799C4.71547 4.40973 4.40973 4.71547 4.21799 5.0918C4 5.51962 4 6.08009 4 7.2002V16.8002C4 17.9203 4 18.4801 4.21799 18.9079C4.40973 19.2842 4.71547 19.5905 5.0918 19.7822C5.5192 20 6.07899 20 7.19691 20H16.8031C17.921 20 18.48 20 18.9074 19.7822C19.2837 19.5905 19.5905 19.2839 19.7822 18.9076C20 18.4802 20 17.921 20 16.8031V14M16 5L10 11V14H13L19 8M16 5L19 2L22 5L19 8M16 5L19 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', OcBook24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.75A.75.75 0 0 1 .75 3h7.497c1.566 0 2.945.8 3.751 2.014A4.495 4.495 0 0 1 15.75 3h7.5a.75.75 0 0 1 .75.75v15.063a.752.752 0 0 1-.755.75l-7.682-.052a3 3 0 0 0-2.142.878l-.89.891a.75.75 0 0 1-1.061 0l-.902-.901a2.996 2.996 0 0 0-2.121-.879H.75a.75.75 0 0 1-.75-.75Zm12.75 15.232a4.503 4.503 0 0 1 2.823-.971l6.927.047V4.5h-6.75a3 3 0 0 0-3 3ZM11.247 7.497a3 3 0 0 0-3-2.997H1.5V18h6.947c1.018 0 2.006.346 2.803.98Z"></path></svg>', OcCalendar24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M6.75 0a.75.75 0 0 1 .75.75V3h9V.75a.75.75 0 0 1 1.5 0V3h2.75c.966 0 1.75.784 1.75 1.75v16a1.75 1.75 0 0 1-1.75 1.75H3.25a1.75 1.75 0 0 1-1.75-1.75v-16C1.5 3.784 2.284 3 3.25 3H6V.75A.75.75 0 0 1 6.75 0ZM21 9.5H3v11.25c0 .138.112.25.25.25h17.5a.25.25 0 0 0 .25-.25Zm-17.75-5a.25.25 0 0 0-.25.25V8h18V4.75a.25.25 0 0 0-.25-.25Z"></path></svg>', OcDatabase24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.25c2.487 0 4.773.402 6.466 1.079.844.337 1.577.758 2.112 1.264.536.507.922 1.151.922 1.907v12.987l-.026.013h.026c0 .756-.386 1.4-.922 1.907-.535.506-1.268.927-2.112 1.264-1.693.677-3.979 1.079-6.466 1.079s-4.774-.402-6.466-1.079c-.844-.337-1.577-.758-2.112-1.264C2.886 19.9 2.5 19.256 2.5 18.5h.026l-.026-.013V5.5c0-.756.386-1.4.922-1.907.535-.506 1.268-.927 2.112-1.264C7.226 1.652 9.513 1.25 12 1.25ZM4 14.371v4.116l-.013.013H4c0 .211.103.487.453.817.351.332.898.666 1.638.962 1.475.589 3.564.971 5.909.971 2.345 0 4.434-.381 5.909-.971.739-.296 1.288-.63 1.638-.962.349-.33.453-.607.453-.817h.013L20 18.487v-4.116a7.85 7.85 0 0 1-1.534.8c-1.693.677-3.979 1.079-6.466 1.079s-4.774-.402-6.466-1.079a7.843 7.843 0 0 1-1.534-.8ZM20 12V7.871a7.85 7.85 0 0 1-1.534.8C16.773 9.348 14.487 9.75 12 9.75s-4.774-.402-6.466-1.079A7.85 7.85 0 0 1 4 7.871V12c0 .21.104.487.453.817.35.332.899.666 1.638.961 1.475.59 3.564.972 5.909.972 2.345 0 4.434-.382 5.909-.972.74-.295 1.287-.629 1.638-.96.35-.33.453-.607.453-.818ZM4 5.5c0 .211.103.487.453.817.351.332.898.666 1.638.962 1.475.589 3.564.971 5.909.971 2.345 0 4.434-.381 5.909-.971.739-.296 1.288-.63 1.638-.962.349-.33.453-.607.453-.817 0-.211-.103-.487-.453-.817-.351-.332-.898-.666-1.638-.962-1.475-.589-3.564-.971-5.909-.971-2.345 0-4.434.381-5.909.971-.739.296-1.288.63-1.638.962C4.104 5.013 4 5.29 4 5.5Z"></path></svg>', OcDot24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm0-1.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"></path></svg>', OcLightBulb24: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2.5c-3.81 0-6.5 2.743-6.5 6.119 0 1.536.632 2.572 1.425 3.56.172.215.347.422.527.635l.096.112c.21.25.427.508.63.774.404.531.783 1.128.995 1.834a.75.75 0 0 1-1.436.432c-.138-.46-.397-.89-.753-1.357a18.111 18.111 0 0 0-.582-.714l-.092-.11c-.18-.212-.37-.436-.555-.667C4.87 12.016 4 10.651 4 8.618 4 4.363 7.415 1 12 1s8 3.362 8 7.619c0 2.032-.87 3.397-1.755 4.5-.185.23-.375.454-.555.667l-.092.109c-.21.248-.405.481-.582.714-.356.467-.615.898-.753 1.357a.751.751 0 0 1-1.437-.432c.213-.706.592-1.303.997-1.834.202-.266.419-.524.63-.774l.095-.112c.18-.213.355-.42.527-.634.793-.99 1.425-2.025 1.425-3.561C18.5 5.243 15.81 2.5 12 2.5ZM8.75 18h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5Zm.75 3.75a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z"/></svg>', OcPaintbrush16: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M11.134 1.535c.7-.509 1.416-.942 2.076-1.155.649-.21 1.463-.267 2.069.34.603.601.568 1.411.368 2.07-.202.668-.624 1.39-1.125 2.096-1.011 1.424-2.496 2.987-3.775 4.249-1.098 1.084-2.132 1.839-3.04 2.3a3.744 3.744 0 0 1-1.055 3.217c-.431.431-1.065.691-1.657.861-.614.177-1.294.287-1.914.357A21.151 21.151 0 0 1 .797 16H.743l.007-.75H.749L.742 16a.75.75 0 0 1-.743-.742l.743-.008-.742.007v-.054a21.25 21.25 0 0 1 .13-2.284c.067-.647.187-1.287.358-1.914.17-.591.43-1.226.86-1.657a3.746 3.746 0 0 1 3.227-1.054c.466-.893 1.225-1.907 2.314-2.982 1.271-1.255 2.833-2.75 4.245-3.777ZM1.62 13.089c-.051.464-.086.929-.104 1.395.466-.018.932-.053 1.396-.104a10.511 10.511 0 0 0 1.668-.309c.526-.151.856-.325 1.011-.48a2.25 2.25 0 1 0-3.182-3.182c-.155.155-.329.485-.48 1.01a10.515 10.515 0 0 0-.309 1.67Zm10.396-10.34c-1.224.89-2.605 2.189-3.822 3.384l1.718 1.718c1.21-1.205 2.51-2.597 3.387-3.833.47-.662.78-1.227.912-1.662.134-.444.032-.551.009-.575h-.001V1.78c-.014-.014-.113-.113-.548.027-.432.14-.995.462-1.655.942Zm-4.832 7.266-.001.001a9.859 9.859 0 0 0 1.63-1.142L7.155 7.216a9.7 9.7 0 0 0-1.161 1.607c.482.302.889.71 1.19 1.192Z"></path></svg>', OcPencil24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M17.263 2.177a1.75 1.75 0 0 1 2.474 0l2.586 2.586a1.75 1.75 0 0 1 0 2.474L19.53 10.03l-.012.013L8.69 20.378a1.753 1.753 0 0 1-.699.409l-5.523 1.68a.748.748 0 0 1-.747-.188.748.748 0 0 1-.188-.747l1.673-5.5a1.75 1.75 0 0 1 .466-.756L14.476 4.963ZM4.708 16.361a.26.26 0 0 0-.067.108l-1.264 4.154 4.177-1.271a.253.253 0 0 0 .1-.059l10.273-9.806-2.94-2.939-10.279 9.813ZM19 8.44l2.263-2.262a.25.25 0 0 0 0-.354l-2.586-2.586a.25.25 0 0 0-.354 0L16.061 5.5Z"></path></svg>', OcPeople16: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z"></path></svg>', OcPeople24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547 9.005 9.005 0 0 1 5.9 8.18.751.751 0 0 1-1.5.045 7.5 7.5 0 0 0-14.993 0 .75.75 0 0 1-1.499-.044 9.005 9.005 0 0 1 5.9-8.181A5.496 5.496 0 0 1 3.5 8ZM9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.29 4c-.148 0-.292.01-.434.03a.75.75 0 1 1-.212-1.484 4.53 4.53 0 0 1 3.38 8.097 6.69 6.69 0 0 1 3.956 6.107.75.75 0 0 1-1.5 0 5.193 5.193 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8Z"></path></svg>', OcPerson24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a5.5 5.5 0 0 1 3.096 10.047 9.005 9.005 0 0 1 5.9 8.181.75.75 0 1 1-1.499.044 7.5 7.5 0 0 0-14.993 0 .75.75 0 0 1-1.5-.045 9.005 9.005 0 0 1 5.9-8.18A5.5 5.5 0 0 1 12 2.5ZM8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"></path></svg>', OcProjectTemplate24: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M3.75 3.5a.25.25 0 0 0-.25.25v2.062a.75.75 0 1 1-1.5 0V3.75C2 2.783 2.783 2 3.75 2h2.062a.75.75 0 1 1 0 1.5Zm13.688-.75a.75.75 0 0 1 .75-.75h2.062c.966 0 1.75.783 1.75 1.75v2.062a.75.75 0 1 1-1.5 0V3.75a.25.25 0 0 0-.25-.25h-2.062a.75.75 0 0 1-.75-.75ZM2.75 17.438a.75.75 0 0 1 .75.75v2.062c0 .138.112.25.25.25h2.062a.75.75 0 1 1 0 1.5H3.75A1.75 1.75 0 0 1 2 20.25v-2.062a.75.75 0 0 1 .75-.75Zm18.5 0a.75.75 0 0 1 .75.75v2.062A1.75 1.75 0 0 1 20.25 22h-2.062a.75.75 0 1 1 0-1.5h2.062a.25.25 0 0 0 .25-.25v-2.062a.75.75 0 0 1 .75-.75Zm-18.5-8.25a.75.75 0 0 1 .75.75v4.124a.75.75 0 1 1-1.5 0V9.938a.75.75 0 0 1 .75-.75ZM9.188 2.75a.75.75 0 0 1 .75-.75h4.124a.75.75 0 1 1 0 1.5H9.938a.75.75 0 0 1-.75-.75Zm0 18.5a.75.75 0 0 1 .75-.75h4.124a.75.75 0 1 1 0 1.5H9.938a.75.75 0 0 1-.75-.75ZM21.25 9.188a.75.75 0 0 1 .75.75v4.124a.75.75 0 1 1-1.5 0V9.938a.75.75 0 0 1 .75-.75ZM3.75 8.25a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1-.75-.75Zm5.5 0A.75.75 0 0 1 10 7.5h2A.75.75 0 0 1 12 9h-2a.75.75 0 0 1-.75-.75Zm-1-4.5A.75.75 0 0 1 9 4.5v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm0 5.5A.75.75 0 0 1 9 10v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm0 4.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75ZM14 8.25a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z"/></svg>', OcRocket24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M20.322.75h1.176a1.75 1.75 0 0 1 1.75 1.749v1.177a10.75 10.75 0 0 1-2.925 7.374l-1.228 1.304a23.699 23.699 0 0 1-1.596 1.542v5.038c0 .615-.323 1.184-.85 1.5l-4.514 2.709a.75.75 0 0 1-1.12-.488l-.963-4.572a1.305 1.305 0 0 1-.14-.129L8.04 15.96l-1.994-1.873a1.305 1.305 0 0 1-.129-.14l-4.571-.963a.75.75 0 0 1-.49-1.12l2.71-4.514c.316-.527.885-.85 1.5-.85h5.037a23.668 23.668 0 0 1 1.542-1.594l1.304-1.23A10.753 10.753 0 0 1 20.321.75Zm-6.344 4.018v-.001l-1.304 1.23a22.275 22.275 0 0 0-3.255 3.851l-2.193 3.29 1.859 1.744a.545.545 0 0 1 .034.034l1.743 1.858 3.288-2.192a22.263 22.263 0 0 0 3.854-3.257l1.228-1.303a9.251 9.251 0 0 0 2.517-6.346V2.5a.25.25 0 0 0-.25-.25h-1.177a9.252 9.252 0 0 0-6.344 2.518ZM6.5 21c-1.209 1.209-3.901 1.445-4.743 1.49a.236.236 0 0 1-.18-.067.236.236 0 0 1-.067-.18c.045-.842.281-3.534 1.49-4.743.9-.9 2.6-.9 3.5 0 .9.9.9 2.6 0 3.5Zm-.592-8.588L8.17 9.017c.23-.346.47-.685.717-1.017H5.066a.25.25 0 0 0-.214.121l-2.167 3.612ZM16 15.112c-.333.248-.672.487-1.018.718l-3.393 2.262.678 3.223 3.612-2.167a.25.25 0 0 0 .121-.214ZM17.5 8a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 17.5 8Z"></path></svg>', OcStop16: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>', Paintbrush16: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M11.134 1.535c.7-.509 1.416-.942 2.076-1.155.649-.21 1.463-.267 2.069.34.603.601.568 1.411.368 2.07-.202.668-.624 1.39-1.125 2.096-1.011 1.424-2.496 2.987-3.775 4.249-1.098 1.084-2.132 1.839-3.04 2.3a3.744 3.744 0 0 1-1.055 3.217c-.431.431-1.065.691-1.657.861-.614.177-1.294.287-1.914.357A21.151 21.151 0 0 1 .797 16H.743l.007-.75H.749L.742 16a.75.75 0 0 1-.743-.742l.743-.008-.742.007v-.054a21.25 21.25 0 0 1 .13-2.284c.067-.647.187-1.287.358-1.914.17-.591.43-1.226.86-1.657a3.746 3.746 0 0 1 3.227-1.054c.466-.893 1.225-1.907 2.314-2.982 1.271-1.255 2.833-2.75 4.245-3.777ZM1.62 13.089c-.051.464-.086.929-.104 1.395.466-.018.932-.053 1.396-.104a10.511 10.511 0 0 0 1.668-.309c.526-.151.856-.325 1.011-.48a2.25 2.25 0 1 0-3.182-3.182c-.155.155-.329.485-.48 1.01a10.515 10.515 0 0 0-.309 1.67Zm10.396-10.34c-1.224.89-2.605 2.189-3.822 3.384l1.718 1.718c1.21-1.205 2.51-2.597 3.387-3.833.47-.662.78-1.227.912-1.662.134-.444.032-.551.009-.575h-.001V1.78c-.014-.014-.113-.113-.548.027-.432.14-.995.462-1.655.942Zm-4.832 7.266-.001.001a9.859 9.859 0 0 0 1.63-1.142L7.155 7.216a9.7 9.7 0 0 0-1.161 1.607c.482.302.889.71 1.19 1.192Z"></path></svg>', Pencil24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M17.263 2.177a1.75 1.75 0 0 1 2.474 0l2.586 2.586a1.75 1.75 0 0 1 0 2.474L19.53 10.03l-.012.013L8.69 20.378a1.753 1.753 0 0 1-.699.409l-5.523 1.68a.748.748 0 0 1-.747-.188.748.748 0 0 1-.188-.747l1.673-5.5a1.75 1.75 0 0 1 .466-.756L14.476 4.963ZM4.708 16.361a.26.26 0 0 0-.067.108l-1.264 4.154 4.177-1.271a.253.253 0 0 0 .1-.059l10.273-9.806-2.94-2.939-10.279 9.813ZM19 8.44l2.263-2.262a.25.25 0 0 0 0-.354l-2.586-2.586a.25.25 0 0 0-.354 0L16.061 5.5Z"></path></svg>', PencilLine: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path><path d="m15 5 3 3"></path></svg>', People16: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z"></path></svg>', People24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 8a5.5 5.5 0 1 1 8.596 4.547 9.005 9.005 0 0 1 5.9 8.18.751.751 0 0 1-1.5.045 7.5 7.5 0 0 0-14.993 0 .75.75 0 0 1-1.499-.044 9.005 9.005 0 0 1 5.9-8.181A5.496 5.496 0 0 1 3.5 8ZM9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.29 4c-.148 0-.292.01-.434.03a.75.75 0 1 1-.212-1.484 4.53 4.53 0 0 1 3.38 8.097 6.69 6.69 0 0 1 3.956 6.107.75.75 0 0 1-1.5 0 5.193 5.193 0 0 0-3.696-4.972l-.534-.16v-1.676l.41-.209A3.03 3.03 0 0 0 17.29 8Z"></path></svg>', Person24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5a5.5 5.5 0 0 1 3.096 10.047 9.005 9.005 0 0 1 5.9 8.181.75.75 0 1 1-1.499.044 7.5 7.5 0 0 0-14.993 0 .75.75 0 0 1-1.5-.045 9.005 9.005 0 0 1 5.9-8.18A5.5 5.5 0 0 1 12 2.5ZM8 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z"></path></svg>', Puzzle: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="Environment / Puzzle"><path id="Vector" d="M20 7H17.8486C17.3511 7 17 6.49751 17 6C17 4.34315 15.6569 3 14 3C12.3431 3 11 4.34315 11 6C11 6.49751 10.6488 7 10.1513 7H8C7.44771 7 7 7.44772 7 8V10.1513C7 10.6488 6.49751 11 6 11C4.34315 11 3 12.3431 3 14C3 15.6569 4.34315 17 6 17C6.49751 17 7 17.3511 7 17.8486V20C7 20.5523 7.44771 21 8 21L20 21C20.5523 21 21 20.5523 21 20V17.8486C21 17.3511 20.4975 17 20 17C18.3431 17 17 15.6569 17 14C17 12.3431 18.3431 11 20 11C20.4975 11 21 10.6488 21 10.1513L21 8C21 7.44772 20.5523 7 20 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', Question: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" fill="currentColor" width="16px" height="16px"><!--! Font Awesome Free 6.5.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. --><path d="M80 160c0-35.3 28.7-64 64-64h32c35.3 0 64 28.7 64 64v3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74V320c0 17.7 14.3 32 32 32s32-14.3 32-32v-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7V160c0-70.7-57.3-128-128-128H144C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"></path></svg>', QuestionMark: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-question-mark"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"></path><path d="M12 19l0 .01"></path></svg>', RiChatNewLine: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14 3V5H4V18.3851L5.76282 17H20V10H22V18C22 18.5523 21.5523 19 21 19H6.45455L2 22.5V4C2 3.44772 2.44772 3 3 3H14ZM19 3V0H21V3H24V5H21V8H19V5H16V3H19Z"/></svg>', RiSparkling2Line: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px"><path d="M17.0007 1.20825 18.3195 3.68108 20.7923 4.99992 18.3195 6.31876 17.0007 8.79159 15.6818 6.31876 13.209 4.99992 15.6818 3.68108 17.0007 1.20825ZM10.6673 9.33325 15.6673 11.9999 10.6673 14.6666 8.00065 19.6666 5.33398 14.6666.333984 11.9999 5.33398 9.33325 8.00065 4.33325 10.6673 9.33325ZM11.4173 11.9999 9.18905 10.8115 8.00065 8.58325 6.81224 10.8115 4.58398 11.9999 6.81224 13.1883 8.00065 15.4166 9.18905 13.1883 11.4173 11.9999ZM19.6673 16.3333 18.0007 13.2083 16.334 16.3333 13.209 17.9999 16.334 19.6666 18.0007 22.7916 19.6673 19.6666 22.7923 17.9999 19.6673 16.3333Z"></path></svg>', Rocket24: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor"><path d="M20.322.75h1.176a1.75 1.75 0 0 1 1.75 1.749v1.177a10.75 10.75 0 0 1-2.925 7.374l-1.228 1.304a23.699 23.699 0 0 1-1.596 1.542v5.038c0 .615-.323 1.184-.85 1.5l-4.514 2.709a.75.75 0 0 1-1.12-.488l-.963-4.572a1.305 1.305 0 0 1-.14-.129L8.04 15.96l-1.994-1.873a1.305 1.305 0 0 1-.129-.14l-4.571-.963a.75.75 0 0 1-.49-1.12l2.71-4.514c.316-.527.885-.85 1.5-.85h5.037a23.668 23.668 0 0 1 1.542-1.594l1.304-1.23A10.753 10.753 0 0 1 20.321.75Zm-6.344 4.018v-.001l-1.304 1.23a22.275 22.275 0 0 0-3.255 3.851l-2.193 3.29 1.859 1.744a.545.545 0 0 1 .034.034l1.743 1.858 3.288-2.192a22.263 22.263 0 0 0 3.854-3.257l1.228-1.303a9.251 9.251 0 0 0 2.517-6.346V2.5a.25.25 0 0 0-.25-.25h-1.177a9.252 9.252 0 0 0-6.344 2.518ZM6.5 21c-1.209 1.209-3.901 1.445-4.743 1.49a.236.236 0 0 1-.18-.067.236.236 0 0 1-.067-.18c.045-.842.281-3.534 1.49-4.743.9-.9 2.6-.9 3.5 0 .9.9.9 2.6 0 3.5Zm-.592-8.588L8.17 9.017c.23-.346.47-.685.717-1.017H5.066a.25.25 0 0 0-.214.121l-2.167 3.612ZM16 15.112c-.333.248-.672.487-1.018.718l-3.393 2.262.678 3.223 3.612-2.167a.25.25 0 0 0 .121-.214ZM17.5 8a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 17.5 8Z"></path></svg>', Scissors: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>', SiExcalidraw: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Excalidraw</title><path d="M23.9428 19.8058a.1962.1962 0 0 0-.1679-.0337c-1.26-1.8552-2.8727-3.6104-4.4186-5.3152l-.2521-.284c-.0016-.0732-.0667-.1207-.1342-.1504-.0284-.0277-.0562-.0558-.0843-.0837-.0505-.1005-.1685-.1673-.2858-.1005-.4706.2347-.9068.5855-1.3274.9195-.5536.4345-1.1085.8695-1.6296 1.354a5.0577 5.0577 0 0 0-.5879.6185c-.0842.1168-.0168.2172.0843.2672-.3701.3677-.7402.736-1.109 1.1198a.1896.1896 0 0 0-.0506.1342c0 .05.0337.1.0668.1168l.6559.5012v.0169c.9237.9194 2.5538 2.1729 4.2844 3.5268.2515.201.5205.4014.7727.6017.1173.1342.2346.2847.3357.4182.0506.0662.1685.0837.2353.0331.0337.0337.0843.0668.118.1005a.2395.2395 0 0 0 .1004.0337.1534.1534 0 0 0 .1348-.0668.2371.2371 0 0 0 .0331-.1004c.0175 0 .0169.0168.0337.0168a.1915.1915 0 0 0 .1348-.0505l3.058-3.3265c.1198-.1159.0135-.2668-.0005-.2672zm-7.6277-.1336-1.5459-1.1704-.151-.0998c-.0337-.0169-.0674-.0506-.1011-.0668l-.1174-.1005c.6597-.659 1.3297-1.3074 1.9996-1.9557-.4874.4844-1.4622 1.9057-1.2606 2.3733.0023 0 .0186.0419.0674.0842.3704.311.7398.6232 1.109.9357zm4.0997 3.1261-1.277-.97a26.9056 26.9056 0 0 0-1.5795-1.5044c.689.5181 1.2769.9694 1.3611 1.053.6722.585.6379.485 1.0922.8696l.5542.4008c-.0735.103-.151.1477-.151.151zm.3357.2503-.0337-.0168c.0506-.0331.1011-.0668.1517-.1168zM.5885 3.4751c.0331.2172.0843.4344.1174.6354.2015 1.103.4031 2.1061.7726 2.8583l.1516.568c.0506.2173.1342.485.2185.5519.8568.7521 2.1674 1.8714 3.5785 2.9419a.1775.1775 0 0 0 .2185 0s0 .0162.0168.0162a.1528.1528 0 0 0 .118.0506.1912.1912 0 0 0 .1341-.0506c1.798-1.9887 3.1418-3.6267 4.0997-4.9974.0674-.0668.0843-.1673.0843-.251.0668-.0668.1173-.1504.1847-.2004.0668-.0668.0668-.184 0-.2346l-.0168-.0163c0-.033-.0169-.0836-.0506-.1005-.42-.4007-.722-.6848-1.0416-.9856A93.5546 93.5546 0 0 1 6.822 1.9876c-.0169-.0169-.0337-.0337-.0674-.0337-.3358-.1168-1.0248-.2341-1.8817-.3845C3.596 1.3527 1.865 1.0519.3027.583c0 0-.1011 0-.118.0169L.1348.6505C.0498.7139.0222.7058 0 .7167.017.8172.017.884.0506 1.0013c0 .0331.0673.3009.0673.334zm7.1909 4.7802-.0337.0337a.0362.0362 0 0 1 .0337-.0337zM6.553 2.238c.101.1005.5211.5019.6216.5855-.4369-.201-1.5284-.7022-2.0333-.8695.5043.1005 1.1933.201 1.4117.284ZM.7901 1.4027c.2521.4344.4537 1.9388.6553 3.4095-.118-.4682-.2016-.9357-.3027-1.3708C.9917 2.673.84 1.9876.6385 1.3858c.1232 0 .1516.0212.1516.0169zm-.2858-.3683c0-.0162 0-.033-.0169-.033.0843 0 .1342.0168.2016.0499.0006.0057-.1448-.0169-.1847-.0169zM23.6738.8172c.0169-.0662-.3358-.367-.2184-.3845.2527-.0163.2527-.4008 0-.4008-.3358.0169-.6884.0999-1.008.1504-.5878.1168-1.1926.2341-1.781.3671-1.327.2846-2.6375.5855-3.9481.937-.4032.1167-.857.2003-1.2432.4007-.1348.0668-.118.2004-.0506.284-.0337.0169-.0505.0169-.0842.0337-.1174.0169-.2185.0337-.3358.05-.1011.0168-.1516.1004-.1348.201 0 .0162.0169.0499.0169.0661-.7059.9363-1.4954 1.9226-2.3523 2.9757-.84.9694-1.7306 1.9893-2.6212 3.0424-2.8396 3.3096-6.0487 7.0705-9.5936 10.38a.1613.1613 0 0 0 0 .2341c.0169.0163.0337.0331.0506.0331-.0506.0506-.1011.0843-.1517.1336-.0337.0337-.0505.0668-.0505.1005a.364.364 0 0 0-.0668.0837c-.0674.0667-.0674.1835.0169.234.0667.0662.1847.0662.2346-.0168.0175-.0169.0175-.0337.0337-.0337a.2648.2648 0 0 1 .3701 0c.2016.2178.4032.435.588.6186l-.4201-.3508c-.0674-.0668-.1847-.05-.2347.0168-.068.0662-.0511.1835.0163.234l4.4691 3.7273c.0337.0337.0674.0337.118.0337.0505 0 .0842-.0169.1173-.0506l.101-.0999c.017.0163.05.0163.0669.0163.0505 0 .0842-.0163.118-.05 6.0486-6.0505 10.9216-10.6141 16.4997-14.6927.05-.0331.0668-.1.0668-.1505.0674 0 .118-.05.151-.1167 1.0254-3.1255 1.227-5.9007 1.2938-7.2709 0-.0579.0169-.0371.0169-.0668.0168-.0337.0168-.0505.0168-.0505a.9784.9784 0 0 0-.0668-.6186zm-10.82 4.9144c.2684-.3008.5374-.6186.8064-.9026-1.7306 2.2734-4.6033 5.7665-8.67 9.9288C7.7626 11.699 10.5517 8.54 12.854 5.7316ZM5.1414 23.4662c-.0162-.0168-.0162-.0168 0-.0168zm2.5033-2.156c.1348-.1505.2695-.284.4206-.4345 0 0 0 .0163.0168.0163-.2236.1978-.4334.4182-.4374.4182zm.6896-.6686c.0994-.0993.14-.1724.2852-.3177.9917-1.0193 2.0164-2.0393 3.058-3.0755l.0169-.0168c.2521-.2004.5542-.4177.8232-.6186a228.0627 228.0627 0 0 0-4.1833 4.0286zm6.5187-16.732c-.5543.719-1.1759 1.6716-1.697 2.4238-1.6463 2.3733-6.9393 8.1735-7.0566 8.274A1189.6473 1189.6473 0 0 1 1.26 19.204l-.1005.1005c-.0843-.1005-.0843-.251.0168-.3346 7.476-7.0037 12.0132-12.837 13.845-15.3944-.0506.1167-.0843.2166-.1685.334zm2.9064 3.4269c-.6716-.3851-.9905-.9869-.8064-1.5712l.0506-.201a.7753.7753 0 0 1 .0842-.1666c.1848-.301.4538-.5518.7564-.7023.0163 0 .0331 0 .05-.0168-.0169-.0337-.0169-.0837-.0169-.1336.0169-.1005.0843-.1673.2016-.1673.2016 0 .8238.1841 1.059.3845.0669.05.1343.1168.2017.1836.0842.1004.2184.2677.2852.4013.0337.0169.0674.1841.118.2678.0336.1336.0667.284.0505.4176-.0169.0169 0 .1167-.0169.1167a1.6055 1.6055 0 0 1-.2184.6186c-.0307.0307.0064.0119-.0505.0668-.0843.1342-.2016.251-.319.3346-.3869.2672-.8238.3508-1.2606.234-.1105-.0473-.1672-.0667-.1685-.0667zm4.3692 1.4039c0 .0168-.0168.0499 0 .0667-.0337 0-.0505.0169-.0842.0337-1.3274.9689-2.6212 1.9888-3.915 3.0256 1.109-.9868 2.218-1.9894 3.3776-2.9756.3358-.3009.5711-.6854.6379-1.1199l.1685-1.003v-.0332c.0842-.201.4032-.1173.3526.1-.0042-.0012-.1731.795-.5374 1.9057z"/></svg>', SiSanfranciscomunicipalrailway: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>San Francisco Municipal Railway</title><path d="M16.62 15.698v-4.847s0-.232-.237-.232c-.225 0-.225.232-.225.232v6.678h-.924V9.925s-.022-1.154 1.15-1.154c1.153 0 1.153 1.153 1.153 1.153v4.156s0 1.618 1.616 1.618c1.615 0 1.615-1.618 1.615-1.618V6.448h.924v9.25s0 2.073-2.54 2.073c-2.532 0-2.532-2.073-2.532-2.073m-5.542-1.607V6.448h.925v6.71s-.023.233.23.233c.254 0 .23-.232.23-.232v-6.71h.923v7.631s.095 1.157-1.153 1.157c-1.247 0-1.155-1.146-1.155-1.146m-8.306 1.146L2.77 10.85s0-.232-.23-.232c-.232 0-.232.232-.232.232v6.678h-.922V9.925s0-1.154 1.154-1.154 1.154 1.153 1.154 1.153v4.156s0 1.618 1.613 1.618c1.618 0 1.618-1.618 1.618-1.618V9.925s-.02-1.154 1.15-1.154c1.158 0 1.158 1.153 1.158 1.153v7.605H8.31v-6.678s0-.232-.237-.232c-.225 0-.225.232-.225.232v4.386s-.03 2.534-2.542 2.534c-2.513 0-2.535-2.534-2.535-2.534m19.385-8.789H24V17.53h-1.843zM9.695 15.237V9.924s0-1.61-1.62-1.61c-1.612 0-1.612 1.61-1.612 1.61v4.156s0 1.157-1.156 1.157c-1.154 0-1.154-1.157-1.154-1.157V9.925s0-1.611-1.613-1.611c-1.616 0-1.616 1.61-1.616 1.61v7.605H0V8.771s0-2.543 2.54-2.543 2.54 2.543 2.54 2.543l.01 4.42s-.01.2.217.2c.242 0 .235-.232.235-.232V8.77s0-2.543 2.532-2.543c2.545 0 2.54 2.543 2.54 2.543l.005 5.31s-.075 1.617 1.613 1.617c1.69 0 1.614-1.618 1.614-1.618l.002-5.31s0-2.541 2.535-2.541c2.537 0 2.537 2.542 2.537 2.542l.008 4.388s-.008.232.225.232c.23 0 .23-.232.23-.232v-6.71h.924v7.631s0 1.157-1.154 1.157c-1.157 0-1.157-1.157-1.157-1.157V9.925s0-1.611-1.613-1.611c-1.611 0-1.611 1.61-1.611 1.61v5.313s0 2.534-2.54 2.534c-2.537 0-2.537-2.534-2.537-2.534Z"/></svg>', SiTarget: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="16px" height="16px"><path d="M12.0005 0C18.627 0 24 5.373 24 12.0005 24 18.627 18.627 24 11.9995 24 5.373 24 0 18.627 0 11.9995 0 5.373 5.373 0 12.0005 0zm0 19.826a7.8265 7.8265 0 10-.001-15.652C7.7133 4.2246 4.2653 7.7136 4.2653 12c0 4.2864 3.448 7.7754 7.7342 7.826h.001zm0-3.9853a3.8402 3.8402 0 110-7.6803c2.1204.0006 3.839 1.7197 3.839 3.8401s-1.7186 3.8396-3.839 3.8402z"></path></svg>', SiTemporal: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="16px" height="16px"><path d="M16.206 7.794C15.64 3.546 14.204 0 12 0 9.796 0 8.361 3.546 7.794 7.794 3.546 8.36 0 9.796 0 12c0 2.204 3.546 3.639 7.794 4.206C8.36 20.453 9.796 24 12 24c2.204 0 3.639-3.546 4.206-7.794C20.454 15.64 24 14.204 24 12c0-2.204-3.547-3.64-7.794-4.206Zm-8.55 7.174c-4.069-.587-6.44-1.932-6.44-2.969 0-1.036 2.372-2.381 6.44-2.969-.09.98-.137 1.98-.137 2.97 0 .99.047 1.99.137 2.968zM12 1.215c1.036 0 2.381 2.372 2.969 6.44a32.718 32.718 0 0 0-5.938 0c.587-4.068 1.932-6.44 2.969-6.44Zm4.344 13.753c-.2.03-1.022.126-1.23.146-.02.209-.117 1.03-.145 1.23-.588 4.068-1.933 6.44-2.97 6.44-1.036 0-2.38-2.372-2.968-6.44-.03-.2-.126-1.022-.147-1.23a31.833 31.833 0 0 1 0-6.23 31.813 31.813 0 0 1 7.46.146c4.068.587 6.442 1.933 6.442 2.969-.001 1.036-2.374 2.382-6.442 2.97z"></path></svg>', Sparkling2Line: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="16px" height="16px"><path d="M17.0007 1.20825 18.3195 3.68108 20.7923 4.99992 18.3195 6.31876 17.0007 8.79159 15.6818 6.31876 13.209 4.99992 15.6818 3.68108 17.0007 1.20825ZM10.6673 9.33325 15.6673 11.9999 10.6673 14.6666 8.00065 19.6666 5.33398 14.6666.333984 11.9999 5.33398 9.33325 8.00065 4.33325 10.6673 9.33325ZM11.4173 11.9999 9.18905 10.8115 8.00065 8.58325 6.81224 10.8115 4.58398 11.9999 6.81224 13.1883 8.00065 15.4166 9.18905 13.1883 11.4173 11.9999ZM19.6673 16.3333 18.0007 13.2083 16.334 16.3333 13.209 17.9999 16.334 19.6666 18.0007 22.7916 19.6673 19.6666 22.7923 17.9999 19.6673 16.3333Z"></path></svg>', Stop16: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 16 16" fill="currentColor"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>', Target: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="16px" height="16px"><path d="M12.0005 0C18.627 0 24 5.373 24 12.0005 24 18.627 18.627 24 11.9995 24 5.373 24 0 18.627 0 11.9995 0 5.373 5.373 0 12.0005 0zm0 19.826a7.8265 7.8265 0 10-.001-15.652C7.7133 4.2246 4.2653 7.7136 4.2653 12c0 4.2864 3.448 7.7754 7.7342 7.826h.001zm0-3.9853a3.8402 3.8402 0 110-7.6803c2.1204.0006 3.839 1.7197 3.839 3.8401s-1.7186 3.8396-3.839 3.8402z"></path></svg>', Temporal: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="16px" height="16px"><path d="M16.206 7.794C15.64 3.546 14.204 0 12 0 9.796 0 8.361 3.546 7.794 7.794 3.546 8.36 0 9.796 0 12c0 2.204 3.546 3.639 7.794 4.206C8.36 20.453 9.796 24 12 24c2.204 0 3.639-3.546 4.206-7.794C20.454 15.64 24 14.204 24 12c0-2.204-3.547-3.64-7.794-4.206Zm-8.55 7.174c-4.069-.587-6.44-1.932-6.44-2.969 0-1.036 2.372-2.381 6.44-2.969-.09.98-.137 1.98-.137 2.97 0 .99.047 1.99.137 2.968zM12 1.215c1.036 0 2.381 2.372 2.969 6.44a32.718 32.718 0 0 0-5.938 0c.587-4.068 1.932-6.44 2.969-6.44Zm4.344 13.753c-.2.03-1.022.126-1.23.146-.02.209-.117 1.03-.145 1.23-.588 4.068-1.933 6.44-2.97 6.44-1.036 0-2.38-2.372-2.968-6.44-.03-.2-.126-1.022-.147-1.23a31.833 31.833 0 0 1 0-6.23 31.813 31.813 0 0 1 7.46.146c4.068.587 6.442 1.933 6.442 2.969-.001 1.036-2.374 2.382-6.442 2.97z"></path></svg>', TiBookmark: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-bookmark"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M14 2a5 5 0 0 1 5 5v14a1 1 0 0 1 -1.555 .832l-5.445 -3.63l-5.444 3.63a1 1 0 0 1 -1.55 -.72l-.006 -.112v-14a5 5 0 0 1 5 -5h4z"></path></svg>', TiEar: '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-ear"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M6 10a7 7 0 1 1 13 3.6a10 10 0 0 1 -2 2a8 8 0 0 0 -2 3a4.5 4.5 0 0 1 -6.8 1.4" />\n  <path d="M10 10a3 3 0 1 1 5 2.2" />\n</svg>', TiHexagonLetterG: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-hexagon-letter-g"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M13.666 1.429l6.75 3.98l.096 .063l.093 .078l.106 .074a3.22 3.22 0 0 1 1.284 2.39l.005 .204v7.284c0 1.175 -.643 2.256 -1.623 2.793l-6.804 4.302c-.98 .538 -2.166 .538 -3.2 -.032l-6.695 -4.237a3.23 3.23 0 0 1 -1.678 -2.826v-7.285c0 -1.106 .57 -2.128 1.476 -2.705l6.95 -4.098c1 -.552 2.214 -.552 3.24 .015m.334 5.571h-2a3 3 0 0 0 -3 3v4a3 3 0 0 0 3 3h2a1 1 0 0 0 1 -1v-4a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1l.007 .117a1 1 0 0 0 .993 .883v2h-1a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2a1 1 0 0 0 0 -2"></path></svg>', TiNote: '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n  class="icon icon-tabler icons-tabler-outline icon-tabler-note"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M13 20l7 -7" />\n  <path d="M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7" />\n</svg>', TiQuestionMark: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-question-mark"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"></path><path d="M12 19l0 .01"></path></svg>', TiTie: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-tie"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 22l4 -4l-2.5 -11l.993 -2.649a1 1 0 0 0 -.936 -1.351h-3.114a1 1 0 0 0 -.936 1.351l.993 2.649l-2.5 11l4 4z"></path><path d="M10.5 7h3l5 5.5"></path></svg>', Tie: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-tie"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 22l4 -4l-2.5 -11l.993 -2.649a1 1 0 0 0 -.936 -1.351h-3.114a1 1 0 0 0 -.936 1.351l.993 2.649l-2.5 11l4 4z"></path><path d="M10.5 7h3l5 5.5"></path></svg>', Twitter: '<svg width="16px" height="16px" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.596 5.441c-.45 0-1.137.584-2.003.754A3.79 3.79 0 0 0 15.826 5a3.789 3.789 0 0 0-3.692 4.65c-4.018 0-5.404-3.727-6.79-3.727-1.385 0-1.385 1.614-1.385 2.307 0 2.42.13 4.856 4.455 7.358-1.579 1.237-4.916 1.87-5.378 2.71C2.574 19.14 6.706 20 8.845 20c6.512 0 11.132-3.423 10.85-9.706 1.804-2.206 1.353-4.853.901-4.853z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path></svg>', Waves: '<svg xmlns="http://www.w3.org/2000/svg" width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path></svg>', WifiNone: '<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="System / Wifi_None"><path id="Vector" d="M11 18C11 18.5523 11.4477 19 12 19C12.5523 19 13 18.5523 13 18C13 17.4477 12.5523 17 12 17C11.4477 17 11 17.4477 11 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>', sanfranciscomunicipalrailway: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>San Francisco Municipal Railway</title><path d="M16.62 15.698v-4.847s0-.232-.237-.232c-.225 0-.225.232-.225.232v6.678h-.924V9.925s-.022-1.154 1.15-1.154c1.153 0 1.153 1.153 1.153 1.153v4.156s0 1.618 1.616 1.618c1.615 0 1.615-1.618 1.615-1.618V6.448h.924v9.25s0 2.073-2.54 2.073c-2.532 0-2.532-2.073-2.532-2.073m-5.542-1.607V6.448h.925v6.71s-.023.233.23.233c.254 0 .23-.232.23-.232v-6.71h.923v7.631s.095 1.157-1.153 1.157c-1.247 0-1.155-1.146-1.155-1.146m-8.306 1.146L2.77 10.85s0-.232-.23-.232c-.232 0-.232.232-.232.232v6.678h-.922V9.925s0-1.154 1.154-1.154 1.154 1.153 1.154 1.153v4.156s0 1.618 1.613 1.618c1.618 0 1.618-1.618 1.618-1.618V9.925s-.02-1.154 1.15-1.154c1.158 0 1.158 1.153 1.158 1.153v7.605H8.31v-6.678s0-.232-.237-.232c-.225 0-.225.232-.225.232v4.386s-.03 2.534-2.542 2.534c-2.513 0-2.535-2.534-2.535-2.534m19.385-8.789H24V17.53h-1.843zM9.695 15.237V9.924s0-1.61-1.62-1.61c-1.612 0-1.612 1.61-1.612 1.61v4.156s0 1.157-1.156 1.157c-1.154 0-1.154-1.157-1.154-1.157V9.925s0-1.611-1.613-1.611c-1.616 0-1.616 1.61-1.616 1.61v7.605H0V8.771s0-2.543 2.54-2.543 2.54 2.543 2.54 2.543l.01 4.42s-.01.2.217.2c.242 0 .235-.232.235-.232V8.77s0-2.543 2.532-2.543c2.545 0 2.54 2.543 2.54 2.543l.005 5.31s-.075 1.617 1.613 1.617c1.69 0 1.614-1.618 1.614-1.618l.002-5.31s0-2.541 2.535-2.541c2.537 0 2.537 2.542 2.537 2.542l.008 4.388s-.008.232.225.232c.23 0 .23-.232.23-.232v-6.71h.924v7.631s0 1.157-1.154 1.157c-1.157 0-1.157-1.157-1.157-1.157V9.925s0-1.611-1.613-1.611c-1.611 0-1.611 1.61-1.611 1.61v5.313s0 2.534-2.54 2.534c-2.537 0-2.537-2.534-2.537-2.534Z"/></svg>', LiMapPin: '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />\n  <circle cx="12" cy="10" r="3" />\n</svg>', "map-pin": '<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />\n  <circle cx="12" cy="10" r="3" />\n</svg>', VyBench: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M3 7 c 6 -3 12 -3 18 0" />\n  <path d="M6 10 c 0 3 -2 4 -3 3.5" />\n  <path d="M11 11 c 0 3 -2 4 -3 3.5" />\n  <path d="M16 11 c 0 3 -2 4 -3 3.5" />\n  <path d="M21 10 c 0 4 -2 5 -3.5 4" />\n  <circle cx="12" cy="4" r="0.6" fill="currentColor" stroke="none" />\n</svg>\n', VyCrescent: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M18 12 c 0 5 -4 9 -9 9 c 3 -3 3 -15 0 -18 c 5 0 9 4 9 9 z" />\n  <circle cx="14" cy="9" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="15" cy="12" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="14" cy="15" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyCross: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M4 4 c 4 4 12 12 16 16" />\n  <path d="M20 4 c -4 4 -12 12 -16 16" />\n  <circle cx="12" cy="12" r="3" />\n  <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />\n  <circle cx="4" cy="4" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="20" cy="4" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="4" cy="20" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="20" cy="20" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyDouble8: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M8 16 c -3 0 -3 -4 0 -4 c 3 0 3 4 0 4 c -3 0 -3 -4 0 -4 c 3 0 3 -4 0 -4 c -3 0 -3 4 0 4" />\n  <path d="M14 8 c 4 0 4 4 0 4 c -4 0 -4 4 0 4 c 4 0 4 -4 0 -4" />\n  <path d="M12 12 c 0.5 -0.4 1.5 -0.4 2 0" />\n  <circle cx="19" cy="6" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="18.5" cy="7.5" r="0.6" fill="currentColor" stroke="none" />\n</svg>\n', VyDroplet: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M12 3 c -4 5 -6 9 -6 12 c 0 3 2.5 5 6 5 c 3.5 0 6 -2 6 -5 c 0 -3 -2 -7 -6 -12 z" />\n  <path d="M9 13 c 0 3 1 5 3 5.5" />\n  <circle cx="12" cy="15" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyFigure: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <circle cx="12" cy="5.5" r="2.5" />\n  <path d="M12 8 c 0 3 -2 5 -2 8 c 0 2 1 3 2 3 c 1 0 2 -1 2 -3 c 0 -3 -2 -5 -2 -8" />\n  <path d="M10 12 c -2 0 -3 1 -3 3" />\n  <path d="M14 12 c 2 0 3 1 3 3" />\n  <circle cx="12" cy="5.5" r="0.5" fill="currentColor" stroke="none" />\n</svg>\n', VyFolio: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M4 5 c 3 -1 6 -1 8 1 c 2 -2 5 -2 8 -1" />\n  <path d="M4 5 L 4 19" />\n  <path d="M20 5 L 20 19" />\n  <path d="M4 19 c 3 -1 6 -1 8 1 c 2 -2 5 -2 8 -1" />\n  <path d="M12 6 L 12 20" />\n  <path d="M6 9 L 10 9" />\n  <path d="M6 12 L 10 12" />\n  <path d="M14 9 L 18 9" />\n  <path d="M14 12 L 18 12" />\n</svg>\n', VyGallow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M8 21 c 0 -3 0 -8 0 -14 c 0 -2 2 -3.5 4 -3 c 2.2 0.6 3 3 1 4.2 c -1.8 1.1 -3 -1 -1.5 -2.4 c 1.5 -1.4 4.5 -0.8 5 1.5 c 0.5 2.5 -2 4.2 -4 3.5" />\n  <path d="M8 12 c 1.5 0.4 3 0.4 4.5 0" />\n  <circle cx="8" cy="21" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyHookDot: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M15 8 c 0 -3 -6 -3 -6 0 c 0 3 6 3 6 0 c 0 4 -0.5 8 -2 10 c -1.5 2 -5 2 -6 0" />\n  <circle cx="16" cy="4.5" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="18" cy="6" r="0.7" fill="currentColor" stroke="none" />\n  <path d="M7 18 c -0.8 0.6 -0.8 1.6 0 2.2" />\n</svg>\n', VyKnotted: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M6 8 c 4 -4 8 4 12 0 c -4 -4 -8 4 -12 0" />\n  <path d="M6 16 c 4 -4 8 4 12 0 c -4 -4 -8 4 -12 0" />\n  <path d="M12 4 L 12 20" />\n  <circle cx="12" cy="4" r="0.7" fill="currentColor" stroke="none" />\n  <circle cx="12" cy="20" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyLattice: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <circle cx="6" cy="6" r="1.6" />\n  <circle cx="18" cy="6" r="1.6" />\n  <circle cx="12" cy="12" r="1.6" />\n  <circle cx="6" cy="18" r="1.6" />\n  <circle cx="18" cy="18" r="1.6" />\n  <path d="M7.5 6 c 1.5 1.5 2 3.5 3 4.5" />\n  <path d="M16.5 6 c -1.5 1.5 -2 3.5 -3 4.5" />\n  <path d="M7.5 18 c 1.5 -1.5 2 -3.5 3 -4.5" />\n  <path d="M16.5 18 c -1.5 -1.5 -2 -3.5 -3 -4.5" />\n  <path d="M6 7.5 c 0 3 0 6 0 9" />\n  <path d="M18 7.5 c 0 3 0 6 0 9" />\n  <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyLeafPair: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M12 22 L 12 9" />\n  <path d="M12 12 c -4 -1 -6 -4 -6 -7 c 2 -0.5 5 1 6 4" />\n  <path d="M12 9 c 4 -1 6 -4 6 -7 c -2 -0.5 -5 1 -6 4" />\n  <circle cx="12" cy="21.5" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VyOrb: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <circle cx="12" cy="10" r="6" />\n  <circle cx="12" cy="10" r="3" />\n  <path d="M12 16 c 0 2 -1 4 -3 4" />\n  <path d="M12 16 c 0 2 1 4 3 4" />\n  <circle cx="12" cy="10" r="0.9" fill="currentColor" stroke="none" />\n  <circle cx="9" cy="20" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="15" cy="20" r="0.6" fill="currentColor" stroke="none" />\n</svg>\n', VySpiral: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M12 12 m 0 0 c 0.5 0 1 0 1 -1 c 0 -1.5 -1.5 -1.5 -2 -1 c -1.5 1 -1.5 3.5 0.5 4 c 3 0.5 4 -3 2 -5 c -3 -3 -7 0 -6 4 c 1 5 8 6 10 1 c 2 -5 -3 -11 -9 -9 c -6 2 -6 10 0 12" />\n</svg>\n', VyStar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <circle cx="12" cy="12" r="3" />\n  <path d="M12 3 c 0 3 0 5 0 6" />\n  <path d="M12 15 c 0 3 0 5 0 6" />\n  <path d="M3 12 c 3 0 5 0 6 0" />\n  <path d="M15 12 c 3 0 5 0 6 0" />\n  <path d="M6 6 c 1.5 1.5 3 3 4 4" />\n  <path d="M14 14 c 1.5 1.5 3 3 4 4" />\n  <path d="M18 6 c -1.5 1.5 -3 3 -4 4" />\n  <path d="M10 14 c -1.5 1.5 -3 3 -4 4" />\n  <circle cx="12" cy="3" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="12" cy="21" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="3" cy="12" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="21" cy="12" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />\n</svg>\n', VySwan: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M6 20 c 0 -6 1 -10 5 -12 c 3 -1.5 6 0 6 3 c 0 3 -4 3 -5 0.5 c -1 -2.5 2 -4 4 -2 c 2 2 1.5 5 -1 6" />\n  <path d="M6 20 c 3 1 6 1 9 -0.5" />\n  <circle cx="18" cy="5" r="0.6" fill="currentColor" stroke="none" />\n  <circle cx="19.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />\n</svg>\n' };

// src/icons/render.ts
function isEmoji(str) {
  if (!str)
    return false;
  return str.length <= 4 && !/^[A-Z][a-z]/.test(str);
}
function createIconElement(svgString, color, qualityClass, ringColor = null) {
  const span = document.createElement("span");
  if (svgString) {
    span.innerHTML = svgString;
    const svg = span.querySelector("svg");
    if (svg) {
      if (color) {
        svg.style.stroke = color;
        svg.style.color = color;
      }
      if (qualityClass) {
        for (const cls of qualityClass.split(/\s+/).filter(Boolean))
          svg.classList.add(cls);
      }
      if (ringColor) {
        svg.style.filter = `drop-shadow(0 0 0.75px ${ringColor}) drop-shadow(0 0 0.75px ${ringColor})`;
      }
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
    const iconEl = createIconElement(svg, color, qualityInfo.cssClass, qualityInfo.ringColor || null);
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
        const qualityInfo = item.file instanceof import_obsidian2.TFile ? plugin.getQualityColorInfo(item.file.path, "fileExplorer") : { color: null, cssClass: null, ringColor: null };
        const color = qualityInfo.color || iconConfig.color || plugin.settings.defaultIconColor;
        span.appendChild(
          createIconElement(svg, color, qualityInfo.cssClass, qualityInfo.ringColor || null)
        );
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
      span.appendChild(
        createIconElement(svg, color, qualityInfo.cssClass, qualityInfo.ringColor || null)
      );
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
    span.appendChild(
      createIconElement(svg, color, qualityInfo.cssClass, qualityInfo.ringColor || null)
    );
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
    return other.resolution.linkpath === this.resolution.linkpath && other.resolution.color === this.resolution.color && other.resolution.qualityClass === this.resolution.qualityClass && other.resolution.ringColor === this.resolution.ringColor && other.resolution.svg === this.resolution.svg;
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
      if (this.resolution.qualityClass) {
        for (const cls of this.resolution.qualityClass.split(/\s+/).filter(Boolean)) {
          svg.classList.add(cls);
        }
      }
      if (this.resolution.ringColor) {
        const r = this.resolution.ringColor;
        svg.style.filter = `drop-shadow(0 0 0.75px ${r}) drop-shadow(0 0 0.75px ${r})`;
      }
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
function extractLinkTarget(raw) {
  let s = raw.trim();
  if (s.startsWith("[[") && s.endsWith("]]"))
    s = s.slice(2, -2).trim();
  const pipe = s.indexOf("|");
  if (pipe !== -1)
    s = s.slice(0, pipe).trim();
  const hash = s.indexOf("#");
  if (hash !== -1)
    s = s.slice(0, hash).trim();
  return s || null;
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
  let handledUpTo = -1;
  tree.iterate({
    enter(node) {
      const name = node.name || "";
      if (!name.includes(INTERNAL_LINK_NODE_HINT))
        return;
      if (node.from < handledUpTo)
        return;
      if (overlapsSelection(state2, node.from, node.to))
        return;
      const linkpath = extractLinkTarget(state2.doc.sliceString(node.from, node.to));
      if (!linkpath)
        return;
      const resolution = resolve(linkpath);
      if (!resolution)
        return;
      const widget = new LinkIconWidget(resolution);
      const deco = import_view2.Decoration.widget({ widget, side: -1 });
      builder.add(node.from, node.from, deco);
      handledUpTo = node.to;
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
      return {
        svg: svg2,
        color: null,
        qualityClass: qualityInfo.cssClass,
        ringColor: qualityInfo.ringColor || null,
        linkpath
      };
    }
    const svg = getSvgSync(parsed.pack, parsed.name);
    if (!svg)
      return null;
    return {
      svg,
      color,
      qualityClass: qualityInfo.cssClass,
      ringColor: qualityInfo.ringColor || null,
      linkpath
    };
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
    this.registerEvent(
      this.app.metadataCache.on("resolved", () => {
        invalidateConnectivity();
        this.debouncedDecorate();
      })
    );
    this.app.workspace.onLayoutReady(() => {
      setTimeout(() => {
        invalidateConnectivity();
        this.debouncedDecorate();
      }, 2e3);
    });
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
    new import_obsidian5.Notice("Customize Icons v1.7.13 loaded (Vy icons baked in + rebuild fallback)");
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
    const qualityScore = this.settings.enableQualityColoring ? getQualityScore(this.app, filePath) : null;
    const qualityHigh = qualityScore !== null && qualityScore >= this.settings.qualityHighThreshold;
    let connectivityHigh = false;
    if (this.settings.enableConnectivityColoring && this.settings.connectivityToggles[surface] !== false) {
      const penaltyList = this.settings.connectivityPenaltyFolders.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
      const inPenalty = penaltyList.some((p) => filePath.startsWith(p));
      if (!inPenalty) {
        if (!isConnectivityBuilt())
          buildConnectivityScores(this.app, this.settings);
        const conn = getConnectivityScore(filePath);
        if (conn >= this.settings.connectivityThreshold)
          connectivityHigh = true;
      }
    }
    if (qualityHigh && connectivityHigh) {
      return {
        color: this.settings.qualityHighColor,
        cssClass: "ci-quality-high ci-both-high",
        ringColor: this.settings.connectivityColor
      };
    }
    if (qualityHigh) {
      return { color: this.settings.qualityHighColor, cssClass: "ci-quality-high" };
    }
    if (connectivityHigh) {
      return { color: this.settings.connectivityColor, cssClass: "ci-connectivity" };
    }
    if (this.settings.enableQualityColoring && qualityScore !== null) {
      return { color: this.settings.qualityExistsColor, cssClass: "ci-quality-exists" };
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
        const parsed = JSON.parse(data);
        if (parsed && Object.keys(parsed).length > 0)
          return parsed;
      }
    } catch (e) {
    }
    if (icons_bundle_default && Object.keys(icons_bundle_default).length > 0) {
      return icons_bundle_default;
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
    let scanFailed = false;
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
      console.warn("[customize-icons] rebuildIconBundle scan failed; falling back to baked bundle", e);
      scanFailed = true;
    }
    if (Object.keys(bundle).length === 0 && icons_bundle_default) {
      for (const k in icons_bundle_default)
        bundle[k] = icons_bundle_default[k];
    }
    try {
      await this.app.vault.adapter.write(bundlePath, JSON.stringify(bundle));
    } catch (e) {
      if (!scanFailed)
        throw e;
    }
    setBundledIcons(bundle);
    if (this.settings.enableLivePreviewLinkIcons)
      await this.warmLivePreviewCache();
    return Object.keys(bundle).length;
  }
};
