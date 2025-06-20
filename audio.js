const fs = require("fs");

const filepath = "confident-543.mp3";
const data = fs.readFileSync(filepath);
const base64 = `data:audio/mp3;base64,${data.toString("base64")}`;

console.log(base64);
