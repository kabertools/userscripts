class DescrGen {
    constructor(width = 79) {
        this._lines = [];
        this._width = width;
    }

    addLine(line) {
        this._lines.push(line);
    }

    addCenterLine(line) {
        const padding = Math.floor((this._width - line.length) / 2);
        const centeredLine = ' '.repeat(padding) + line;
        this._lines.push(centeredLine);
    }

    addPadRight(field, padSize, padChar, sep, value) {
        const paddedField = field + padChar.repeat(padSize - field.length);
        const line = paddedField + sep + value;
        this._lines.push(line);
    }

    addSeparator(char = '-', length = this._width) {
        this._lines.push(char.repeat(length));
    }

    generate() {
        return this._lines.join('\n');
    }
}
