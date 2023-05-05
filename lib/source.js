import { isText } from 'istextorbinary';
import { encodeTokenBag } from './tokens.js';

import { glob } from 'glob-gitignore';
import path from "path";
import fs from "fs/promises";

// Hard-coded list of file patterns to always ignore, that wouldn't be in a gitignore and would be a waste of tokens.
const IGNORED_FILE_PATTERNS = [
    'README.md', '*.lock'
];

export class SourceBag {
    constructor(src, tokens, i = 0, total = 1) {
        this._src = src;
        this.tokens = tokens;
        this._i = i;
        this._total = total;
    }

    get src() {
        if (this._i > 0) {
            return `${this._src} (part ${this._i} of ${this._total})`
        } else {
            return this._src;
        }
    }

    get code() {
        return this.tokens.toString();
    }

    get size() {
        return this.tokens.size;
    }

    split(maxBagSize) {
        if (this.size <= maxBagSize) {
            return [this];
        } else {
            return this.tokens.split(maxBagSize)
                .map((bag, i, arr) => new SourceBag(this._src, bag, i + 1, arr.length));
        }
    }
}

export const readSourceFiles = async (repoPath) => {
    const gitignore = (await fs.readFile(path.join(repoPath, '.gitignore'))).toString('utf-8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => !!p);

    const filePaths = (await glob(['**/*'], { cwd: repoPath, nodir: true, ignore: [...gitignore, ...IGNORED_FILE_PATTERNS] }));

    const fileSources$ = filePaths.map(src =>
    (fs.readFile(path.join(repoPath, src))
        .then(buf => [buf]
            .filter(buf => isText(src, buf))
            .map(buf => buf.toString('utf8'))
            .map(code => new SourceBag(src, encodeTokenBag(code))))));

    return (await Promise.all(fileSources$)).flat();
}
