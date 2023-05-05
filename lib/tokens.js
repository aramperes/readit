import { MODEL_NAME } from "./prompt.js";
import { encoding_for_model } from "@dqbd/tiktoken";

export class TokenBag {
    constructor(enc, tokens) {
        this.enc = enc;
        this.tokens = tokens;
    }

    split(maxBagSize) {
        if (maxBagSize <= 0 || this.size <= 0) return [];

        const totalBags = Math.ceil(this.size / maxBagSize);
        const bags = new Array(totalBags);

        const firstBagSize = Math.ceil(this.size / totalBags);
        const otherBagSize = Math.floor(this.size / totalBags);
        const bagSizes = bags.fill(0).map((_, i) => (i == 0) ? firstBagSize : otherBagSize);

        for (let i = 0, o = 0; i < totalBags; o += bagSizes[i++]) {
            const tokens = this.tokens.slice(o, o + bagSizes[i]);
            bags[i] = new TokenBag(this.enc, tokens);
        }

        return bags;
    }

    toString() {
        const buf = this.enc.decode(this.tokens);
        return new TextDecoder().decode(buf);
    }

    get size() {
        return this.tokens.length;
    }

    free() {
        this.enc.free();
    }
}

export const encodeTokenBag = (str) => {
    const enc = encoding_for_model(MODEL_NAME);
    const tokens = enc.encode(str);
    return new TokenBag(enc, tokens);
}

export const encodeSize = (str) => {
    const bag = encodeTokenBag(str);
    const size = bag.size;
    bag.free();
    return size;
}
