'use strict';

const co = require('co');
const is = require('is-type-of');


module.exports = {

  loadFile(filepath) {
    try {
      const obj = require(filepath);
      if (!obj) return obj;
      // it's es module
      if (obj.__esModule) return 'default' in obj ? obj.default : obj;
      return obj;
    } catch (err) {
      err.message = '[egg-core] load file: ' + filepath + ', error: ' + err.message;
      throw err;
    }
  },

  existsModule(filepath) {
    try {
      require.resolve(filepath);
      return true;
    } catch (e) {
      return false;
    }
  },

  methods: [ 'head', 'options', 'get', 'put', 'patch', 'post', 'delete' ],

  * callFn(fn, args) {
    args = args || [];
    if (!is.function(fn)) return;
    if (is.generatorFunction(fn)) {
      return yield fn(...args);
    }
    const r = fn(...args);
    if (is.promise(r)) {
      return yield r;
    }
    return r;
  },

  middleware(fn) {
    if (is.generatorFunction(fn)) return fn;

    // support async function
    return function* (next) {
      // next is a generator
      yield module.exports.callFn(fn, [ this, () => co(next) ]);
    };
  },

  getCalleeFromStack(withLine) {
    const limit = Error.stackTraceLimit;
    const prep = Error.prepareStackTrace;

    Error.prepareStackTrace = prepareObjectStackTrace;
    Error.stackTraceLimit = 4;

    // capture the stack
    const obj = {};
    Error.captureStackTrace(obj);
    let callSite = obj.stack[2];
    /* istanbul ignore next */
    if (callSite) {
      // egg-mock will create a proxy
      // https://github.com/eggjs/egg-mock/blob/master/lib/app.js#L167
      const filename = callSite.getFileName() || '';
      if (filename.endsWith('egg-mock/lib/app.js')) callSite = obj.stack[3];
    }

    Error.prepareStackTrace = prep;
    Error.stackTraceLimit = limit;

    /* istanbul ignore next */
    if (!callSite) return '<anonymous>';
    const fileName = callSite.getFileName();
    if (!withLine || !fileName) return fileName || '<anonymous>';
    return `${fileName}:${callSite.getLineNumber()}:${callSite.getColumnNumber()}`;
  },
};


/**
 * Capture call site stack from v8.
 * https://github.com/v8/v8/wiki/Stack-Trace-API
 */

function prepareObjectStackTrace(obj, stack) {
  return stack;
}
