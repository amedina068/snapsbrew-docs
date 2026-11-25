#!/usr/bin/env node
// Checks the Markdown pages of this repository.
//
// 1. Each page has front matter with `title`, `description` and `order`.
// 2. Each internal link resolves to a page, and each anchor to a heading.
// 3. Each `php artisan <command>` in a page exists in the app.
// 4. Each environment variable in the code of a page exists in the app.
// 5. Each endpoint on an API page (`api/*.md`) exists in the OpenAPI file of
//    the app, and each operation of that file is on an API page.
//
// Checks 3, 4 and 5 need the source of the app. Set SNAPSBREW_APP_PATH to the
// app folder. If SNAPSBREW_APP_PATH is not set, the script runs checks 1 and 2
// only. If the app folder has `vendor/`, the script reads the commands from
// `php artisan list`. If not, it reads the signatures in
// `app/Console/Commands` and a fixed list of framework commands.
//
// Check 5 reads `docs/api/openapi.yaml` of the app. An older app checkout
// does not have this file. Then the script writes a warning and skips check 5.
// The check reads an endpoint from two places on an API page:
// - a line `METHOD /path` in a fenced `http` block,
// - inline code `METHOD /path`, or a table row with `METHOD` and `/path` in
//   two inline code cells.
//
// Usage: node scripts/check-docs.mjs [--links-only]
// No dependencies. Node 20 or later.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const linksOnly = process.argv.includes('--links-only');
const appPath = linksOnly ? null : process.env.SNAPSBREW_APP_PATH || null;

// Folders that hold no published pages.
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'scripts']);
// Files at the root that are not pages, so they need no front matter.
const NON_PAGES = new Set([
  'README.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'SUPPORT.md',
]);

// Environment variables that the app does not read, but that a page names
// on purpose. Each entry says who reads it.
const EXTERNAL_ENV = new Map([
  ['PUPPETEER_EXECUTABLE_PATH', 'read by Puppeteer, not by the app'],
  ['SNAPSBREW_APP_PATH', 'read by the scripts of this repository'],
  ['SNAPSBREW_SIGNING_KEY', 'read by the SDKs, not by the app'],
  ['SNAPSBREW_TOKEN', 'read by the SDKs, not by the app'],
  ['SNAPSBREW_URL', 'read by the SDKs, not by the app'],
  ['SNAPSBREW_WEBHOOK_SECRET', 'read by the SDKs, not by the app'],
  ['SNAPSBREW_TIMEOUT', 'read by the Laravel config of the PHP SDK, not by the app'],
  ['SNAPSBREW_RETRIES', 'read by the Laravel config of the PHP SDK, not by the app'],
  ['SNAPSBREW_WEBHOOK_TOLERANCE', 'read by the Laravel config of the PHP SDK, not by the app'],
  ['YOUR_API_TOKEN', 'the token placeholder of the Postman files, not a variable'],
]);

// Endpoints that an API page documents, but that the OpenAPI file leaves out
// on purpose. Each entry is a path prefix and the reason.
const OUTSIDE_SPEC = new Map([
  ['/v1/tools/', 'the free tools are not in ApiSpec on purpose. See api/free-tools.md'],
]);

// Operations of the OpenAPI file that no API page documents on purpose.
// Each entry is `METHOD /path`, exactly as the file writes it, and the reason.
const NOT_ON_A_PAGE = new Map([]);

// Framework commands that the fallback mode accepts when `vendor/` is missing.
const FRAMEWORK_COMMANDS = [
  'about', 'config:cache', 'config:clear', 'db:seed', 'down', 'horizon',
  'horizon:terminate', 'horizon:status', 'key:generate', 'list', 'mcp:inspector', 'migrate',
  'migrate:fresh', 'migrate:status', 'optimize', 'optimize:clear',
  'passport:keys', 'queue:failed', 'queue:retry', 'queue:work', 'route:cache',
  'route:clear', 'route:list', 'schedule:list', 'schedule:run',
  'schedule:work', 'serve', 'storage:link', 'test', 'tinker', 'up',
  'view:cache', 'view:clear', 'vendor:publish', 'package:discover',
];

const errors = [];
const warnings = [];
const fail = (file, line, message) => errors.push(`${relative(root, file)}:${line}: ${message}`);

// ---------------------------------------------------------------------------
// Collect the pages
// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    // A hidden folder holds no page. The CI clones the app into `.app`.
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.md')) out.push(path);
  }
  return out;
}

const files = walk(root).sort();
const sources = new Map(files.map((file) => [file, readFileSync(file, 'utf8')]));

// ---------------------------------------------------------------------------
// Helpers for Markdown
// ---------------------------------------------------------------------------

/** Splits a page into lines and marks the lines that are in a fenced code block. */
function lines(text) {
  let fence = null;
  return text.split('\n').map((line, index) => {
    const match = line.match(/^\s*(`{3,}|~{3,})/);
    let inCode = fence !== null;
    if (match) {
      if (fence === null) {
        fence = match[1];
        inCode = true;
      } else if (match[1][0] === fence[0] && match[1].length >= fence.length) {
        fence = null;
        inCode = true;
      }
    }
    return { number: index + 1, text: line, inCode };
  });
}

/** The heading slug that GitHub and most Markdown renderers make. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

const anchorCache = new Map();
function anchors(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const seen = new Map();
  const set = new Set();
  for (const line of lines(sources.get(file) ?? readFileSync(file, 'utf8'))) {
    if (line.inCode) continue;
    const match = line.text.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (!match) continue;
    const base = slug(match[1]);
    const count = seen.get(base) ?? 0;
    set.add(count === 0 ? base : `${base}-${count}`);
    seen.set(base, count + 1);
  }
  anchorCache.set(file, set);
  return set;
}

/** Inline code spans of a line that is not in a code block. */
function inlineCode(text) {
  return [...text.matchAll(/(`+)(.+?)\1/g)].map((m) => m[2]);
}

// ---------------------------------------------------------------------------
// Check 1: front matter
// ---------------------------------------------------------------------------

for (const [file, text] of sources) {
  if (NON_PAGES.has(relative(root, file))) continue;
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(file, 1, 'front matter is missing');
    continue;
  }
  for (const field of ['title', 'description', 'order']) {
    if (!new RegExp(`^${field}:\\s*\\S`, 'm').test(match[1])) {
      fail(file, 1, `front matter has no "${field}"`);
    }
  }
  if (!/^order:\s*\d+\s*$/m.test(match[1])) fail(file, 1, '"order" is not an integer');
}

// ---------------------------------------------------------------------------
// Check 2: internal links and anchors
// ---------------------------------------------------------------------------

let linkCount = 0;
for (const [file, text] of sources) {
  for (const line of lines(text)) {
    if (line.inCode) continue;
    const withoutCode = line.text.replace(/(`+).+?\1/g, '');
    for (const match of withoutCode.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // http:, https:, mailto:
      linkCount++;
      const [pathPart, anchor] = target.split('#');
      const targetFile = pathPart === '' ? file : resolve(dirname(file), pathPart);
      if (!existsSync(targetFile)) {
        fail(file, line.number, `link target does not exist: ${target}`);
        continue;
      }
      if (statSync(targetFile).isDirectory()) {
        fail(file, line.number, `link points to a folder, not a page: ${target}`);
        continue;
      }
      if (anchor && targetFile.endsWith('.md') && !anchors(targetFile).has(anchor)) {
        fail(file, line.number, `anchor "#${anchor}" is not a heading in ${relative(root, targetFile)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Checks 3 and 4: commands and environment variables
// ---------------------------------------------------------------------------

let commandCount = 0;
let envCount = 0;

if (appPath) {
  if (!existsSync(join(appPath, 'artisan'))) {
    console.error(`SNAPSBREW_APP_PATH does not point to the app: ${appPath}`);
    process.exit(2);
  }

  const commands = loadCommands(appPath);
  const env = loadEnvKeys(appPath);

  for (const [file, text] of sources) {
    for (const line of lines(text)) {
      // Commands: anywhere in the page, in code or in prose.
      for (const match of line.text.matchAll(/php artisan ([a-z][a-z0-9:_-]*)/g)) {
        commandCount++;
        if (!commands.has(match[1])) {
          fail(file, line.number, `artisan command does not exist: ${match[1]}`);
        }
      }

      // Environment variables: only in code blocks and inline code.
      const chunks = line.inCode ? [line.text] : inlineCode(line.text);
      for (const chunk of chunks) {
        for (const match of chunk.matchAll(/(::|->|\\)?\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)(_\*)?/g)) {
          if (match[1]) continue; // a PHP constant or a class name, not a variable
          const name = match[2];
          // A name with no underscore (`TIMEOUT`, `HTTP`) is not a variable, except as a `NAME_*` prefix.
          if (!match[3] && !name.includes('_')) continue;
          envCount++;
          if (match[3]) {
            const prefix = `${name}_`;
            if (![...env].some((key) => key.startsWith(prefix))) {
              fail(file, line.number, `no environment variable starts with ${prefix}`);
            }
            continue;
          }
          if (!env.has(name) && !EXTERNAL_ENV.has(name)) {
            fail(file, line.number, `environment variable is not in the app: ${name}`);
          }
        }
      }
    }
  }
} else {
  warnings.push('SNAPSBREW_APP_PATH is not set. The command, environment variable and endpoint checks did not run.');
}

// ---------------------------------------------------------------------------
// Check 5: API endpoints against the OpenAPI file of the app
// ---------------------------------------------------------------------------

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
let endpointCount = 0;
let specOperationCount = 0;

if (appPath) {
  const specFile = join(appPath, 'docs', 'api', 'openapi.yaml');
  if (!existsSync(specFile)) {
    warnings.push(`The app has no ${relative(appPath, specFile)}, so the endpoint check did not run.`);
  } else {
    const spec = loadSpecOperations(specFile);
    specOperationCount = spec.size;
    const documented = new Set();

    for (const [file, text] of sources) {
      if (!relative(root, file).startsWith(`api${'/'}`)) continue;
      for (const { number, method, path } of pageEndpoints(text)) {
        endpointCount++;
        const key = `${method} ${normalizePath(path)}`;
        documented.add(key);
        if (spec.has(key)) continue;
        if ([...OUTSIDE_SPEC.keys()].some((prefix) => path.startsWith(prefix))) continue;
        fail(file, number, `endpoint is not in the OpenAPI file of the app: ${method} ${path}`);
      }
    }

    for (const [key, original] of spec) {
      if (documented.has(key) || NOT_ON_A_PAGE.has(original)) continue;
      errors.push(`api/: no API page documents the operation ${original} of the OpenAPI file`);
    }
    for (const original of NOT_ON_A_PAGE.keys()) {
      if (![...spec.values()].includes(original)) {
        errors.push(`scripts/check-docs.mjs: NOT_ON_A_PAGE names ${original}, which is not in the OpenAPI file`);
      }
    }
  }
}

/** Replaces each path parameter ({id}, :id, <id>) with {} and removes the query string. */
function normalizePath(path) {
  return path
    .split('?')[0]
    .replace(/\/+$/, '')
    .split('/')
    .map((segment) => (/^(\{[^}]*\}|:[A-Za-z_]\w*|<[^>]*>)$/.test(segment) ? '{}' : segment))
    .join('/');
}

/**
 * Reads the operations of an OpenAPI file with no YAML library. Under the
 * top-level `paths:` key, a path is indented two spaces and an HTTP method
 * four spaces. Returns a map of the normalized `METHOD /path` to the original.
 */
function loadSpecOperations(file) {
  const operations = new Map();
  let inPaths = false;
  let path = null;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (/^\S/.test(line)) {
      inPaths = /^paths:\s*$/.test(line);
      path = null;
      continue;
    }
    if (!inPaths) continue;
    const pathMatch = line.match(/^ {2}(['"]?)(\/[^'"]*)\1:\s*$/);
    if (pathMatch) {
      path = pathMatch[2];
      continue;
    }
    const methodMatch = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (methodMatch && path) {
      const method = methodMatch[1].toUpperCase();
      operations.set(`${method} ${normalizePath(path)}`, `${method} ${path}`);
    }
  }
  return operations;
}

/** The `METHOD /path` claims of one page, with their line numbers. */
function pageEndpoints(text) {
  const found = [];
  const methods = HTTP_METHODS.join('|');
  let fence = null;
  for (const [index, line] of text.split('\n').entries()) {
    const number = index + 1;
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*(\S*)/);
    if (fenceMatch) {
      if (fence === null) fence = { marker: fenceMatch[1], language: fenceMatch[2] };
      else if (fenceMatch[1][0] === fence.marker[0] && fenceMatch[1].length >= fence.marker.length) fence = null;
      continue;
    }
    if (fence !== null) {
      const match = fence.language === 'http' && line.match(new RegExp(`^(${methods})\\s+(\\/\\S*)\\s*$`));
      if (match) found.push({ number, method: match[1], path: match[2] });
      continue;
    }
    for (const match of line.matchAll(new RegExp(`\`(${methods}) (\\/[^\`\\s]*)\``, 'g'))) {
      found.push({ number, method: match[1], path: match[2] });
    }
    for (const match of line.matchAll(new RegExp(`\`(${methods})\`\\s*\\|\\s*\`(\\/[^\`\\s]*)\``, 'g'))) {
      found.push({ number, method: match[1], path: match[2] });
    }
  }
  return found;
}

function loadCommands(app) {
  const names = new Set();
  if (existsSync(join(app, 'vendor', 'autoload.php'))) {
    try {
      const json = execFileSync('php', ['artisan', 'list', '--format=json', '--no-ansi'], {
        cwd: app,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      for (const command of JSON.parse(json).commands) names.add(command.name);
      return names;
    } catch (error) {
      warnings.push(`php artisan list failed, so the script used the fallback list: ${error.message.split('\n')[0]}`);
    }
  } else {
    warnings.push('The app has no vendor/ folder, so the script used the fallback command list.');
  }

  for (const name of FRAMEWORK_COMMANDS) names.add(name);
  const dir = join(app, 'app', 'Console', 'Commands');
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.php')) continue;
    const match = readFileSync(join(dir, file), 'utf8').match(/\$signature\s*=\s*'([^\s']+)/);
    if (match) names.add(match[1]);
  }
  return names;
}

function loadEnvKeys(app) {
  const keys = new Set();
  const add = (regex, text) => {
    for (const match of text.matchAll(regex)) keys.add(match[1]);
  };
  const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

  // KEY=value lines, also commented out ones.
  for (const name of ['.env.example', '.env.docker.example']) {
    add(/^\s*#?\s*([A-Z][A-Z0-9_]*)=/gm, read(join(app, name)));
  }

  // env('KEY') in config/.
  for (const file of listFiles(join(app, 'config'), '.php')) {
    add(/env\(\s*'([A-Z][A-Z0-9_]*)'/g, read(file));
  }

  // Docker and deploy files: KEY: value, KEY=value and ${KEY}.
  const dockerFiles = [join(app, 'docker-compose.yml'), join(app, 'Dockerfile'), ...listFiles(join(app, 'deploy'))];
  for (const file of dockerFiles) {
    const text = read(file);
    add(/^\s*-?\s*([A-Z][A-Z0-9_]*)\s*[:=]/gm, text);
    add(/\$\{?([A-Z][A-Z0-9_]*)/g, text);
    add(/\b([A-Z][A-Z0-9_]*)=/g, text);
  }

  // Variables that the tests and the CI of the app read.
  for (const file of listFiles(join(app, 'tests'))) {
    const text = read(file);
    add(/process\.env\.([A-Z][A-Z0-9_]*)/g, text);
    add(/getenv\(\s*'([A-Z][A-Z0-9_]*)'/g, text);
    add(/env\(\s*'([A-Z][A-Z0-9_]*)'/g, text);
  }
  for (const file of listFiles(join(app, '.github', 'workflows'))) {
    add(/^\s*([A-Z][A-Z0-9_]*)\s*:/gm, read(file));
  }

  // env('KEY') in app/ and bootstrap/, if a class reads one directly.
  for (const dir of ['app', 'bootstrap']) {
    for (const file of listFiles(join(app, dir), '.php')) add(/env\(\s*'([A-Z][A-Z0-9_]*)'/g, read(file));
  }
  return keys;
}

function listFiles(dir, extension = '') {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'vendor') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...listFiles(path, extension));
    else if (name.endsWith(extension)) out.push(path);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

for (const warning of warnings) console.warn(`warning: ${warning}`);
for (const error of errors) console.error(error);

console.log(
  `Checked ${files.length} files: ${linkCount} internal links, ` +
    (appPath
      ? `${commandCount} artisan commands, ${envCount} environment variables, ` +
        `${endpointCount} API endpoints against ${specOperationCount} OpenAPI operations.`
      : 'commands, variables and endpoints skipped.'),
);

if (errors.length > 0) {
  console.error(`${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log('No problems found.');
