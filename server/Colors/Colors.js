class Colors {
    constructor() {
        this.red = '\x1b[31m%s\x1b[0m';
        this.green = '\x1b[32m%s\x1b[0m';
        this.yellow = `\x1b[33m%s\x1b[0m`;
        this.blue = `\x1b[34m%s\x1b[0m`;
    }
}

const color = new Colors();
module.exports.color = color;