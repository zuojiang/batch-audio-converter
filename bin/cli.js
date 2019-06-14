#!/usr/bin/env node
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _child_process = require('child_process');

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _pQueue = require('p-queue');

var _pQueue2 = _interopRequireDefault(_pQueue);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _logUpdate = require('log-update');

var _logUpdate2 = _interopRequireDefault(_logUpdate);

var _cliColor = require('cli-color');

var _cliColor2 = _interopRequireDefault(_cliColor);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var frames = ['-', '\\', '|', '/'];

// function exec (command, callback) {
//   setTimeout(callback, 2000)
// }

function main(_ref) {
  var _ref$_ = _slicedToArray(_ref._, 1),
      _ref$_$ = _ref$_[0],
      input = _ref$_$ === undefined ? process.cwd() : _ref$_$,
      output = _ref.output,
      concurrency = _ref.concurrency,
      outputExtname = _ref.outputExtname,
      inputExtname = _ref.inputExtname,
      ffmpegCommand = _ref.ffmpegCommand,
      ffmpegOptions = _ref.ffmpegOptions,
      deleteOriginal = _ref.deleteOriginal,
      noColor = _ref.noColor,
      absolutePath = _ref.absolutePath,
      skipErrors = _ref.skipErrors;

  input = _path2.default.normalize(input);
  var files = findFiles(input, {
    filter: function filter(file) {
      return new RegExp('\\.' + inputExtname + '$', 'ig').test(file);
    }
  });
  if (files.length == 0) {
    console.log('No found media files!');
  }
  var list = [];
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = files[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var file = _step.value;

      var dir = _path2.default.dirname(output ? file.replace(input, output) : file);
      var ext = _path2.default.extname(file);
      var name = _path2.default.basename(file, ext);
      list.push({
        input: file,
        outDir: dir,
        outFile: name + '.' + outputExtname
      });
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  run({
    list: list,
    concurrency: concurrency,
    ffmpegCommand: ffmpegCommand,
    ffmpegOptions: ffmpegOptions,
    deleteOriginal: deleteOriginal,
    noColor: noColor,
    absolutePath: absolutePath,
    skipErrors: skipErrors
  });
}

function run(_ref2) {
  var _ref2$list = _ref2.list,
      list = _ref2$list === undefined ? [] : _ref2$list,
      concurrency = _ref2.concurrency,
      ffmpegCommand = _ref2.ffmpegCommand,
      ffmpegOptions = _ref2.ffmpegOptions,
      deleteOriginal = _ref2.deleteOriginal,
      noColor = _ref2.noColor,
      absolutePath = _ref2.absolutePath,
      skipErrors = _ref2.skipErrors;

  var startTime = Date.now();
  var queue = new _pQueue2.default({ concurrency: concurrency });
  var log = new Log({
    noColor: noColor
  });
  var successCount = 0;
  var failureCount = 0;
  var length = list.length;

  var _loop = function _loop(i, _length) {
    var _list$i = list[i],
        input = _list$i.input,
        outDir = _list$i.outDir,
        outFile = _list$i.outFile;

    var output = _path2.default.join(outDir, outFile);
    var item = {
      index: i,
      msg: '[' + (i + 1) + '/' + _length + '] ' + (absolutePath ? output : outFile)
    };
    var command = ffmpegCommand + ' ' + JSON.stringify(output) + ' -i ' + JSON.stringify(input) + ' ' + (ffmpegOptions || '');

    queue.add(function () {
      return new Promise(function (resolve, reject) {
        item.startTime = Date.now();
        log.load(item);
        _mkdirp2.default.sync(outDir);
        try {
          _fs2.default.unlinkSync(output);
        } catch (e) {}
        (0, _child_process.exec)(command, function (err) {
          item.endTime = Date.now();
          if (err) {
            failureCount++;
            if (!skipErrors) {
              queue.clear();
            }
            reject(err);
          } else {
            successCount++;
            if (deleteOriginal) {
              _fs2.default.unlink(input, resolve);
            } else {
              resolve();
            }
          }
        });
      });
    }).then(function () {
      log.done(item);
    }, function (err) {
      log.done(item, err);
    });
  };

  for (var i = 0, _length = list.length; i < _length; i++) {
    _loop(i, _length);
  }
  queue.onIdle().then(function () {
    log.stop();
    _logUpdate2.default.done();
    console.log('Total Time: ' + formatTime(Date.now() - startTime) + '; Success: ' + successCount + '; Failure: ' + failureCount);
  });
}

function findFiles(file, opts) {
  var files = [];
  var stat = _fs2.default.statSync(file);
  if (stat.isFile()) {
    if (opts.filter(file)) {
      files.push(file);
    }
  } else if (stat.isDirectory()) {
    var list = _fs2.default.readdirSync(file);
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = list[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var _item = _step2.value;

        files.push.apply(files, _toConsumableArray(findFiles(_path2.default.join(file, _item), opts)));
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  }
  return files;
}

function formatTime(time) {
  return _moment2.default.utc(time).format('HH:mm:ss');
}

var Log = function () {
  function Log(_ref3) {
    var _this = this;

    var noColor = _ref3.noColor;

    _classCallCheck(this, Log);

    this.noColor = noColor;
    this.list = [];

    var i = 0;
    this.render = function () {
      var frame = frames[i = ++i % frames.length];
      var currentTime = Date.now();
      (0, _logUpdate2.default)(_this.list.map(function (item) {
        return '[' + frame + '] [' + formatTime(currentTime - item.startTime) + '] ' + item.msg;
      }).join('\n'));
    };

    this.start = function () {
      _this.render();
      _this.timer = setInterval(_this.render, 80);
    };

    this.start();
  }

  _createClass(Log, [{
    key: 'load',
    value: function load(item) {
      this.list.push(item);
      this.render();
    }
  }, {
    key: 'done',
    value: function done(item) {
      var error = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

      for (var i = 0; i < this.list.length; i++) {
        if (this.list[i] === item) {
          this.list.splice(i, 1);
        }
      }

      var msg = '[' + (error ? '×' : '√') + '] [' + formatTime(item.endTime - item.startTime) + '] ' + item.msg;
      if (!this.noColor) {
        if (error) {
          msg = _cliColor2.default.redBright(msg + '\n' + error.message);
        } else {
          msg = _cliColor2.default.greenBright(msg);
        }
      }
      (0, _logUpdate2.default)(msg);
      _logUpdate2.default.done();
      this.render();
    }
  }, {
    key: 'stop',
    value: function stop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }
  }]);

  return Log;
}();

main(_yargs2.default.usage('batch-audio-converter [options] [file|dir|.]').options({
  'output': {
    alias: 'o',
    describe: 'Output folder',
    normalize: true
  },
  'concurrency': {
    alias: 'p',
    describe: 'Concurrency limit',
    type: 'number',
    default: 3
  },
  'input-extname': {
    alias: 'e',
    describe: 'The extname of the original file',
    default: 'm4a'
  },
  'output-extname': {
    alias: 'E',
    describe: 'The extname of the new file',
    default: 'mp3'
  },
  'ffmpeg-command': {
    alias: 'C',
    describe: 'The path of ffmpeg tool',
    normalize: true,
    default: 'ffmpeg'
  },
  'ffmpeg-options': {
    alias: 'O',
    describe: 'The options of ffmpeg tool',
    type: 'string'
  },
  'delete-original': {
    alias: 'D',
    describe: 'Delete original files',
    type: 'boolean',
    default: false
  },
  'no-color': {
    alias: 'g',
    describe: 'Do not print colored text',
    type: 'boolean',
    default: false
  },
  'absolute-path': {
    alias: 'a',
    describe: 'Print absolute path',
    type: 'boolean',
    default: false
  },
  'skip-errors': {
    alias: 's',
    describe: 'Skip bad files',
    type: 'boolean',
    default: false
  }
}).version(false).strict(true).locale('en').argv);
