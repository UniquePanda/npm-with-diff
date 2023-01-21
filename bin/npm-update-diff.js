#! /usr/bin/env node

const NpmUpdateDiff = require('../lib/NpmUpdateDiff').NpmUpdateDiff;

const isDebug = false;
const searchedTreeDepth = 5;

async function main() {
	await (new NpmUpdateDiff(isDebug).performUpdateWithDiff(searchedTreeDepth));
}

main();
