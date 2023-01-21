#! /usr/bin/env node

const NpmWithDiff = require('../lib/NpmWithDiff').NpmWithDiff;

const argumentsWithValue = ['--searchedTreeDepth'];

let isDebug = false;
let forceExecution = false;
let excludeDevPackagesFromDiff = false;
let searchedTreeDepthForDiff = 10;
let command = '';

async function main() {
	const arguments = process.argv.slice(2); // First two arguments are execPath and path of JS file.

	let internalArguments = []; // Arguments that are used for this script.
	let npmArguments = []; // Arguments that are passed to npm.

	let isReadingInternalArguments = true;
	arguments.forEach((argument) => {
		if (isReadingInternalArguments) {
			if (argument === '--') { // "--" marks the end of internal arguments.
				isReadingInternalArguments = false;
				return;
			}

			internalArguments.push(argument);
		} else {
			npmArguments.push(argument);
		}
	});

	// If no arguments were added for npm and no "--" was added to the arguments, assume that only npm arguments were
	// provided. This is a little "hack" around the double dash convention, but probably reflects most use cases better.
	if (isReadingInternalArguments) {
		npmArguments = internalArguments.slice();
		internalArguments = [];
	}

	// If first npm argument doesn't start with a dash, assume it's an npm command.
	if (npmArguments.length > 0 && !npmArguments[0].startsWith('-')) {
		command = npmArguments.shift(); // All other npm arguments are treated as arguments for the command.
	}

	for (const internalArgument of internalArguments) {
		const splitArgument = internalArgument.split('=');
		const argument = splitArgument[0];
		let value = null;

		if (splitArgument.length > 1) {
			splitArgument.shift();
			value = splitArgument.join('');

			if (!argumentsWithValue.includes(argument)) {
				console.error('Argument "' + argument + '" cannot be provided with a value.');
				return;
			}

			if (value === '') {
				console.error('Please provide a value for argument "' + argument + '".');
				return;
			}
		}

		switch (argument) {
			case '--dev-only-debug':
				isDebug = true;
				break;
			case '--force':
			case '-f':
				forceExecution = true;
				break;
			case '--exclude-dev':
				excludeDevPackagesFromDiff = true;
				break;
			case '--searchedTreeDepth':
				searchedTreeDepthForDiff = value;
				break;
			default:
				console.error('Unknown argument: "' + argument + '".');
				return;
		}
	}


	await (new NpmWithDiff(isDebug).runCommandWithDiff(
		command,
		npmArguments,
		searchedTreeDepthForDiff,
		excludeDevPackagesFromDiff,
		forceExecution
	));
}

main();
