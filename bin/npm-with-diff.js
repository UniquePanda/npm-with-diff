#! /usr/bin/env node

const NpmWithDiff = require('../lib/NpmWithDiff').NpmWithDiff;

// TODO: Add cli options for these
const isDebug = false;
const forceExecution = false;
const includeDevPackagesInDiff = true;
const searchedTreeDepthForDiff = 5;
const command = 'update';
const commandArguments = [];

async function main() {
	await (new NpmWithDiff(isDebug).runCommandWithDiff(
		command,
		commandArguments,
		searchedTreeDepthForDiff,
		includeDevPackagesInDiff,
		forceExecution
	));
}

main();
