#!/usr/bin/env node
"use strict";

const Consolist = require("../consolist");
const fs = require("fs");
const path = require("path");

const imagePath = path.join(__dirname, "dman.raw");

const data = fs.readFileSync(imagePath);

console.log("24-bit mode:");
Consolist.log({
    width: 48,
    height: 92,
    data: data
});

console.log("8-bit mode:");
Consolist.log({
    width: 48,
    height: 92,
    data: data
}, {
    terminal: "ansi8"
});