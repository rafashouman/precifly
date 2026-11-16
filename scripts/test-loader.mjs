import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');

export function load(file, overrides = {}) {
  const cache = new Map();
  function compile(file) {
    const path = resolve(file);
    if (overrides[path]) return overrides[path];
    if (cache.has(path)) return cache.get(path);
    const output = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const loaded = { exports: {} };
    const localRequire = name => name === 'server-only' ? {} : overrides[name] || (name.startsWith('.') ? compile(resolve(dirname(path), name + '.ts')) : require(name));
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename: path })(localRequire, loaded, loaded.exports);
    cache.set(path, loaded.exports);
    return loaded.exports;
  }
  return compile(file);
}
