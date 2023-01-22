import { NpmPackageListEntry, PackageListDiff } from './Interfaces';
import { NpmRunner } from './NpmRunner';

export class NpmWithDiff {
	isDebug = false;

	defaultDiff: PackageListDiff = {
		packageName: '',
		parentPackagesNames: [],
		directDependenciesCount: 0,
		wasAdded: false,
		wasRemoved: false,
		previousVersion: null,
		newVersion: '',
	};

	constructor(isDebug: boolean) {
		this.isDebug = isDebug;
	}

	private comparePackageListsRecursively(
		oldPackageListEntries: Map<string, NpmPackageListEntry>,
		newPackageListEntries: Map<string, NpmPackageListEntry>,
		parentPackagesNames: Array<string> = []
	) {
		let packageListDiffs: Array<PackageListDiff> = [];

		if (!oldPackageListEntries || oldPackageListEntries.size == 0) {
			// If there are new entries, all of them were added.
			for (const [newPackageName, newPackageInfo] of newPackageListEntries) {
				packageListDiffs.push({
					...this.defaultDiff,
					packageName: newPackageName,
					parentPackagesNames: parentPackagesNames.slice(),
					directDependenciesCount: newPackageInfo.dependencies ? newPackageInfo.dependencies.size : 0,
					wasAdded: true,
					newVersion: newPackageInfo.version,
				});
			}

			return packageListDiffs;
		}

		// First traverse all new packages and check if they were added.
		if (newPackageListEntries && newPackageListEntries.size > 0) {
			for (const [packageName, packageInfo] of newPackageListEntries) {
				if (oldPackageListEntries.has(packageName)) {
					continue;
				}

				packageListDiffs.push({
					...this.defaultDiff,
					packageName: packageName,
					parentPackagesNames: parentPackagesNames.slice(),
					directDependenciesCount: packageInfo.dependencies ? packageInfo.dependencies.size : 0,
					wasAdded: true,
					newVersion: packageInfo.version,
				});
			}
		}

		for (const [packageName, packageInfo] of oldPackageListEntries) {
			if (this.isDebug) {
				console.log('Looking at package: ' + parentPackagesNames.concat([packageName]).join(' -> '));
			}

			const newPackage = newPackageListEntries?.get(packageName);
			const oldDependencies = packageInfo.dependencies || new Map();
			const oldWasRemoved = !newPackage;
	
			packageListDiffs.push({
				...this.defaultDiff,
				packageName: packageName,
				parentPackagesNames: parentPackagesNames.slice(),
				directDependenciesCount: oldDependencies.size,
				wasRemoved: oldWasRemoved,
				previousVersion: packageInfo.version,
				newVersion: oldWasRemoved ? null : newPackage.version,
			});

			if (oldWasRemoved) {
				continue;
			}

			packageListDiffs = packageListDiffs.concat(
				this.comparePackageListsRecursively(
					oldDependencies,
					newPackageListEntries.get(packageName)?.dependencies || new Map(),
					parentPackagesNames.concat([packageName])
				)
			);
		}

		return packageListDiffs;
	}

	async runCommandWithDiff(
		command: string,
		commandArguments: Array<string> = [],
		searchedTreeDepthForDiff: number = 20,
		excludeDevPackagesFromDiff: boolean = false,
		forceExecution: boolean = false
	) {
		const npmRunner = new NpmRunner();
		const argumentsString = (command === '' ? '' : (commandArguments.length === 0 ? '' : ' ')) + commandArguments.join(' ');
		const commandWithArgumentsString = command + argumentsString;

		if (!forceExecution && command !== '') {
			const availableCommands = await npmRunner.getAvailableNpmCommands();
			if (!availableCommands.includes(command)) {
				console.error(
					'Couldn\'t find an npm command with name "'
					+ command
					+ '". If you\'re sure it exists, run again with "-f" option.'
				);
	
				return;
			}
		}

		// Fetch current dependency tree (pre command run).
		console.log(
			'Collecting ' + (excludeDevPackagesFromDiff ? 'non-dev ' : '')
			+ 'dependencies (before "'
			+ commandWithArgumentsString
			+ '")...'
		);
		const preDependencies = await npmRunner.getDependencyTree(searchedTreeDepthForDiff, excludeDevPackagesFromDiff);
		if (this.isDebug) {
			console.log('Pre "' + commandWithArgumentsString + '" dependencies:');
			console.log(preDependencies);
		}

		// Run command.
		console.log('Running command "' + commandWithArgumentsString + '"...');
		const commandOutput = await npmRunner.runNpmCommand(command, commandArguments);
		if (this.isDebug) {
			console.log('Command "' + commandWithArgumentsString + '" has run.');
			console.log(commandOutput);
		}

		// Fetch new dependency tree (post command run).
		console.log(
			'Collecting ' + (excludeDevPackagesFromDiff ? 'non-dev ' : '')
			+ 'dependencies (after "'
			+ commandWithArgumentsString
			+ '")...'
		);
		const postDependencies = await npmRunner.getDependencyTree(searchedTreeDepthForDiff, excludeDevPackagesFromDiff);
		if (this.isDebug) {
			console.log('Post "' + commandWithArgumentsString + '" dependencies:');
			console.log(postDependencies);
		}

		const packageListDiffs = this.comparePackageListsRecursively(preDependencies, postDependencies);

		console.log('Command "' + commandWithArgumentsString + '" successfully finished. Command output:');
		console.log(commandOutput);

		// Iterate over all collected packageListDiffs and reduce them to the needed info.
		let diffString = '';
		for (const packageListDiff of packageListDiffs) {
			// No output needed for this package if nothing was changed.
			if (
				!packageListDiff.wasAdded
				&& !packageListDiff.wasRemoved
				&& packageListDiff.previousVersion === packageListDiff.newVersion
			) {
				continue;
			}

			let addToDiffString = '';
			if (diffString !== '') {
				addToDiffString += '\n';
			}

			addToDiffString += packageListDiff.packageName;

			if (packageListDiff.parentPackagesNames.length) {
				addToDiffString += ' ('
					+ packageListDiff.parentPackagesNames.concat(['*' + packageListDiff.packageName + '*']).join(' -> ')
					+ ')';
			}

			if (packageListDiff.wasAdded) {
				addToDiffString += '\n';
				addToDiffString += '\t* Was added.\n';
				addToDiffString += '\t* Has ' + packageListDiff.directDependenciesCount
					+ ' direct dependencies (not listed here).';
			}

			if (packageListDiff.wasRemoved) {
				addToDiffString += '\n';
				addToDiffString += '\t* Was removed.\n';
				addToDiffString += '\t* Had ' + packageListDiff.directDependenciesCount
					+ ' direct dependencies (not listed here).';
			}

			if (
				!packageListDiff.wasAdded && !packageListDiff.wasRemoved
				&& packageListDiff.previousVersion !== packageListDiff.newVersion
			) {
				addToDiffString += '\n';
				addToDiffString += '\t* Was updated.\n';
				addToDiffString += '\t* ' + packageListDiff.previousVersion + ' => ' + packageListDiff.newVersion;
			}

			diffString += addToDiffString;
		}

		console.log(
			'The following ' + (excludeDevPackagesFromDiff ? 'non-dev ' : '')
			+ 'dependencies were changed:'
		);
		console.log(diffString || 'No ' + (excludeDevPackagesFromDiff ? 'non-dev ' : '') + 'dependencies were changed!');
	}
}
