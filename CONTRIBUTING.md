# Contributing to the Snapsbrew docs

Thank you for your help. This file gives the rules for a page and for a pull request. Read [README.md](README.md) for the folder structure, the front matter and the checks.

## Facts come from the code

- Each fact on a page must come from the code of the app. Read the code before you write about it.
- Copy the names of commands, environment variables, routes, fields and error codes from the code. Do not type them from memory.
- If the code does not answer a question, do not guess. Write a `TODO(owner):` line (see below).
- If the docs and the code do not agree, the code is correct. Correct the page, and open an issue in the app repository if the code looks wrong.
- Do not copy private planning files of the app into a page.

## The `TODO(owner):` convention

A `TODO(owner):` line is a question for the maintainer. Write it on its own line, in the place where the answer will go:

```markdown
TODO(owner): Does the scheduler need `onOneServer()` for instances with more than one app server?
```

- Write one question for each line.
- Say what the code shows, then ask the question.
- When the maintainer answers, replace the line with the answer.

## Simple English

Write every page in Simple English, in the style of ASD-STE100 (pragmatic mode). Many readers use translation tools or read English as a second language.

### Procedures (instructions)

- Use the imperative: "Run the migrations."
- Write one instruction in each sentence.
- Write 20 words or fewer in each sentence.
- Put a condition before the command: "If the build fails, read the log."
- Use a numbered list for steps that have an order.

### Descriptions (explanations)

- Use the simple present or the simple past.
- Write 25 words or fewer in each sentence.
- Write one topic in each paragraph, with six sentences or fewer.

### Words

- Use the active voice: "The app stores the key", not "The key is stored".
- Use `can`, `must` and `will`. Do not use `should`, `may`, `might`, `could` or `would`.
- Do not use contractions (`don't`, `it's`) or semicolons.
- Do not use filler words: `simply`, `just`, `easily`, `seamlessly`, `robust`, `leverage`, `utilize`.
- Write "for example" and "that is". Do not write "e.g.", "i.e." or "etc.".
- Use one term for one thing. These docs use: instance, owner, company, template, layer, variant, snap, API token, signed-URL key, usage log, environment variable.
- Write "make sure that" for a check.
- Keep code, commands, file paths and quoted errors exactly as they are. They count as one word.

### Warnings

Start a warning with `WARNING:` (a risk to data or security) or `CAUTION:` (a risk to the instance). Put the instruction first and the risk second.

## Voice

- Write for a person who runs or uses an instance. Use a neutral open-source voice.
- Do not write sales copy, prices or "sign up" text.
- Use the example host `https://snapsbrew.example` and the token placeholder `<your-token>`.
- Never put a real token, key or password on a page.

## Code examples

- Give each API page and the signed URL page an example in curl and in PHP. A server-side JavaScript example is optional.
- Never sign a URL or use a token in browser code. The keys are secret.
- Use the Laravel HTTP client in PHP examples.

## Pull requests

1. Make one change in each pull request.
2. Run `node scripts/check-docs.mjs`. If you have an app checkout, also set `SNAPSBREW_APP_PATH`. Then the script also compares the endpoints on the API pages with the OpenAPI file of the app.
3. Fill in the pull request template.

The CI must pass before a merge.

## Pull request titles

The title of a pull request must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). The `PR title` check of the CI fails if the title does not follow it. The titles of the merged pull requests become the lines of the release notes, so a clear title helps each user.

Start the title with a type: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` or `revert`. A scope in parentheses is optional. Examples:

- `docs: add a page about Cloudflare R2 storage`
- `fix: correct the default value of BROWSERLESS_TIMEOUT`
- `chore: check the anchors of the MCP pages`

## Triage

Each new issue gets the `needs-triage` label. The maintainer reads the issue and replaces `needs-triage` with a type label, for example `bug`, `enhancement`, `documentation` or `question`.
