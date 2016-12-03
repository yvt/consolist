(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define('consolist', ['exports'], factory) :
    (factory((global.Consolist = global.Consolist || {})));
}(this, (function (exports) { 'use strict';

"use strict";

var global = Function('return this')() || {};

function coalesceImage(image)
{
    if (typeof image !== "object") {
        throw new Error("image is not an object.");
    }
    if (global.HTMLCanvasElement && (
      image instanceof global.HTMLImageElement ||
      image instanceof global.HTMLCanvasElement)) {
        // HTML image canvas; convert to ImageData
        var width = image.width | 0;
        var height = image.height | 0;
        if (width <= 0 || height <= 0) {
            throw new Error("image is empty or not loaded.");
        }

        var canvas = global.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);

        return context.getImageData(0, 0, width, height);
    } else if (image.width && image.height && image.data) {
        // ImageData-like object
        return image;
    } else {
        throw new Error("unsupported input image type; HTML image, canvas, or ImageData-like object must be supplied.");
    }
}

function generateGeneric(image, fn, bfn, post)
{
    var width = image.width;
    var height = image.height;
    var data = image.data;

    var cols = width;
    var rows = (height + 1) >> 1;

    var colors = new Uint8Array(8);

    if (!bfn) {
        bfn = function (chunks, _) {
            chunks.push("\n");
        };
    }

    var chunks = [];
    var output = [""];
    for (var y = 0; y < rows; ++y) {
        // 2 image rows per 1 text line
        var index1 = y * width << 3;
        var index2 = index1 + (width << 2);
        if (index2 >= data.length) {
            index2 = -1;
        }
        for (var x = 0; x < cols; ++x) {
            var alpha = data[index1 + 3] * (1 / 255);
            colors[0] = data[index1]     * alpha + 255 * (1 - alpha) + 0.5;
            colors[1] = data[index1 + 1] * alpha + 255 * (1 - alpha) + 0.5;
            colors[2] = data[index1 + 2] * alpha + 255 * (1 - alpha) + 0.5;
            colors[3] = 255;

            if (index2 !== -1) {
                alpha = data[index2 + 3] * (1 / 255);
                colors[4] = data[index2]     * alpha + 255 * (1 - alpha) + 0.5;
                colors[5] = data[index2 + 1] * alpha + 255 * (1 - alpha) + 0.5;
                colors[6] = data[index2 + 2] * alpha + 255 * (1 - alpha) + 0.5;
                colors[7] = 255;
            } else {
                colors[7] = 0;
            }

            fn(colors, chunks, output);
            index1 += 4;
            if (index2 !== -1) {
                index2 += 4;
            }
        }
        if (y < rows - 1) {
            bfn(chunks, output);
        }
    }

    if (post) {
        post(chunks, output);
    }

    output[0] = chunks.join("");

    return output;
}

var bwChars = ["▇", "▄", "▀", " "];
function genericBlackWhite(image)
{
    return generateGeneric(image, function (colors, chunks, _) {
        var bits;
        bits = ((colors[0] + colors[1] + colors[2]) > 382 || colors[3] == 0) ? 1 : 0;
        bits |= ((colors[4] + colors[5] + colors[6]) > 382 || colors[7] == 0) ? 2 : 0;
        chunks.push(bwChars[bits]);
    });
}

var hex8 = (function () {
    var hex8 = [];
    var hex = "0123456789abcdef";
    for (var i = 0; i < 256; ++i) {
        hex8[i] = hex.charAt(i >> 4) + hex.charAt(i & 15);
    }
    return hex8;
})();

function generateBrowserConsole(image)
{
    return generateGeneric(image, function (colors, chunks, output) {
        var color1 = "#" + hex8[colors[0]] + hex8[colors[1]] + hex8[colors[2]];
        var color2 = "#" + hex8[colors[4]] + hex8[colors[5]] + hex8[colors[6]];
        if (colors[7]) {
            chunks.push("%c▄");
            output.push("background:" + color1 + ";color:" + color2 + ";font-family:monospace;" +
                "font-size:16px;line-height: 0.99;");
        } else {
            chunks.push("%c▀");
            output.push("color:" + color1 + ";font-family:monospace;" +
                "font-size:16px;line-height: 0.99;");
        }
    });
}

function generateAnsi24(image)
{
    return generateGeneric(image, function (colors, chunks, _) {
        // ANSI true color sequence (ISO-8613-3 standard)
        // https://gist.github.com/XVilka/8346728

        // text color (upper half)
        chunks.push("\x1b[38;2;" + colors[0] + ";" + colors[1] + ";" + colors[2] + "m");

        // background color (upper half)
        if (colors[7]) {
            chunks.push("\x1b[48;2;" + colors[4] + ";" + colors[5] + ";" + colors[6] + "m");
        } else {
            chunks.push("\x1b[49m"); // default background color
        }

        chunks.push("▀");
    }, function (chunks, _) {
        chunks.push("\x1b[49m\n"); // default background color + line break
    }, function (chunks, _) {
        chunks.push("\x1b[39m"); // default text color
        chunks.push("\x1b[49m"); // default background color
    });
}

function convertColorToAnsi8(red, green, blue)
{
    red = (red * 328965 + 8388608) >> 24;
    green = (green * 328965 + 8388608) >> 24;
    blue = (blue * 328965 + 8388608) >> 24;
    return 16 + 36 * red + 6 * green + blue;
}

function generateAnsi8(image)
{
    return generateGeneric(image, function (colors, chunks, _) {
        // ANSI true color sequence (ISO-8613-3 standard)
        // https://gist.github.com/XVilka/8346728

        // text color (upper half)
        chunks.push("\x1b[38;5;" + convertColorToAnsi8(colors[0], colors[1], colors[2]) + "m");

        // background color (upper half)
        if (colors[7]) {
            chunks.push("\x1b[48;5;" + convertColorToAnsi8(colors[4], colors[5], colors[6]) + "m");
        } else {
            chunks.push("\x1b[49m"); // default background color
        }

        chunks.push("▀");
    }, function (chunks, _) {
        chunks.push("\x1b[49m\n"); // default background color + line break
    }, function (chunks, _) {
        chunks.push("\x1b[39m"); // default text color
        chunks.push("\x1b[49m"); // default background color
    });
}

var defaultTerminal;

if (global.HTMLImageElement && global.navigator) {
    var appVersion = global.navigator.appVersion;
    if (appVersion.indexOf(" Edge/") >= 0 || appVersion.indexOf(" Trident/") >= 0) {
        defaultTerminal = "dumb";
    } else {
        defaultTerminal = "browser";
    }
} else {
    defaultTerminal = "ansi24";
}

function render(image, options)
{
    if (options != null && typeof options !== "object") {
        throw new Error("options is not an object nor nullish.")
    }
    options = options || {};

    image = coalesceImage(image);

    var colorMode = options.colorMode || "color";

    if (colorMode === "bw") {
        return genericBlackWhite(image);
    } else if (colorMode !== "color") {
        throw new Error("unknown color mode");
    }

    switch (options.terminal || defaultTerminal) {
        case "browser":
            return generateBrowserConsole(image);
        case "ansi24":
            return generateAnsi24(image);
        case "ansi8":
            return generateAnsi8(image);
        case "dumb":
            return genericBlackWhite(image);
        default:
        throw new Error("unknown terminal");
    }
}

function log(image, options)
{
    if (options != null && typeof options !== "object") {
        throw new Error("options is not an object nor nullish.")
    }
    options = options || {};

    var generated = render(image, options);
    return console.log.apply(console, generated);
}

exports.log = log;
exports.render = render;

})));
