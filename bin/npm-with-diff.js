#! /usr/bin/env node

const NpmWithDiff = require('../lib/NpmWithDiff').NpmWithDiff;

const isDebug = false;
const searchedTreeDepth = 5;

async function main() {
	await (new NpmWithDiff(isDebug).performUpdateWithDiff(searchedTreeDepth));
}

main();
