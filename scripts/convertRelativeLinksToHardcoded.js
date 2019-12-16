// @ts-check

// Loop through all files switching a reference like:
//  [13]: <src/compiler/checker.ts - function checkIfStatement>
// to
//  [13]: https://github.com/microsoft/TypeScript/blob/8d986554/src/compiler/checker.ts#L30308
//

// Validate:
// node scripts/convertRelativeLinksToHardcoded.js scripts/fixtures/input.md

// Write:
// node scripts/convertRelativeLinksToHardcoded.js scripts/fixtures/input.md --write

const glob = require("glob")
const {readFileSync, writeFileSync, existsSync}  = require("fs")
const {join}  = require("path")
const { execSync } = require("child_process");

if (!process.argv[2]) throw new Error("Did not include a glob for markdown files to change")

// This can be anything
const write = process.argv[3] !== undefined

const possibleTSRepo = ["../typescript-compiler", "../TypeScript", "TypeScript"] 
let repoPath = possibleTSRepo.find(existsSync)
if (!repoPath) throw new Error("Could not find a TypeScript repo");

const repoHead = execSync(`git rev-parse HEAD | cut -c 1-8`, { cwd: repoPath, encoding: "utf8" });
if (!repoHead) throw new Error("Could not get the git info from the sibling TypeScript repo")

const files = glob.sync(process.argv[2])
if (!files.length) throw new Error("Did not get any files with that glob")

files.forEach(file => {
  let content = readFileSync(file, "utf8")  
  // https://regex101.com/r/w1dEG1/1
  const regex = new RegExp(/\[.*]: <(.*) - (.*)>/g)
  
  let result
  while (result = regex.exec(content)) {
    const file = result[1];
    const searchTerm = result[2];
    const original = `: <${file} - ${searchTerm}>`
    const originalFile = readFileSync(join(repoPath, file), "utf8")
    if (!originalFile) throw new Error(`Could not find a file at '${join(repoPath, file)}'`)

    const line = getLineNo(originalFile, new RegExp(searchTerm))
    const lineRef = line && line[0] && line[0].number ? `#L${line[0].number}`: ""
    const replacement = `: https://github.com/microsoft/TypeScript/blob/${repoHead.trim()}/${file}${lineRef}`
    content = content.replace(original, replacement)
  }

  if (write) {
    writeFileSync(file, content)
  } else {
    console.log(content)
  }
});


/*!
 * line-number <https://github.com/jonschlinkert/line-number>
 *
 * Copyright (c) 2014 Jon Schlinkert, contributors.
 * Licensed under the MIT License
 */
function getLineNo(str, re) {
  return str.split(/\r?\n/).map(function (line, i) {
    if (re.test(line)) {
      return {
        line: line,
        number: i + 1,
        match: line.match(re)[0]
      };
    }
  }).filter(Boolean);
};