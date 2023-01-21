#! /usr/bin/env node

const NpmRunDiff = require('../lib/NpmRunDiff').NpmRunDiff;

const isDebug = false;
const searchedTreeDepth = 5;

async function main() {
	await (new NpmRunDiff(isDebug).performUpdateWithDiff(searchedTreeDepth));
}

main();
