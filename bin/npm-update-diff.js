#! /usr/bin/env node

const NpmRunner = require('../lib/NpmRunner').NpmRunner;
const Interfaces = require('../lib/Interfaces');

const npmRunner = new NpmRunner();
const isDebug = false;

/**
 * 
 * @param {Map<string, Interfaces.NpmPackageListEntry>} oldPackageListEntries
 * @param {Map<string, Interfaces.NpmPackageListEntry>} newPackageListEntries
 * @param {Array<string>} parentPackagesNames
 *
 * @return {Array<Interfaces.PackageListDiff>}
 */
function comparePackageListsRecursively(oldPackageListEntries, newPackageListEntries, parentPackagesNames = []) {
	if (!oldPackageListEntries || oldPackageListEntries.size == 0) {
		return [];
	}

	const defaultDiff = {
		packageName: '',
		parentPackagesNames: [],
		directDependenciesCount: 0,
		wasAdded: false,
		wasRemoved: false,
		previousVersion: '',
		newVersion: '',
	};

	packageListDiffs = [];

	for ([packageName, packageInfo] of oldPackageListEntries) {
		if (isDebug) {
			console.log('Looking at package: ' + parentPackagesNames.concat([packageName]).join(' -> '));
		}

		const newPackage = newPackageListEntries?.get(packageName);
		const oldDependencies = oldPackageListEntries.get(packageName).dependencies;
		const oldHasDependencies = !!oldDependencies;
		const oldWasRemoved = !newPackage;

		packageListDiffs.push({
			...defaultDiff,
			packageName: packageName,
			parentPackagesNames: parentPackagesNames,
			directDependenciesCount: oldHasDependencies ? oldDependencies.size : 0,
			wasAdded: false,
			wasRemoved: oldWasRemoved,
			previousVersion: packageInfo.version,
			newVersion: oldWasRemoved ? null : newPackage.version,
		});

		if (oldWasRemoved) {
			continue;
		}

		if (!oldHasDependencies) {
			// If second list has dependencies for this package, they were added.
			if (newPackage.dependencies) {
				for ([addedPackageName, addedPackageInfo] of newPackage.dependencies) {
					packageListDiffs.push({
						packageName: addedPackageName,
						parentPackagesNames: parentPackagesNames.concat([packageName]),
						directDependenciesCount: addedPackageInfo.dependencies ? addedPackageInfo.dependencies.size : 0,
						wasAdded: true,
						wasRemoved: false,
						previousVersion: null,
						newVersion: addedPackageInfo.version,
					});
				}
			}
			continue;
		}

		packageListDiffs = packageListDiffs.concat(
			comparePackageListsRecursively(
				oldDependencies,
				newPackageListEntries.get(packageName).dependencies,
				parentPackagesNames.concat([packageName])
			)
		);
	}

	return packageListDiffs;
}

const searchedTreeDepth = 5;
async function main() {
	// Fetch current dependency tree (pre update).
	console.log('Fetching current dependencies (before updating)...');
	const preUpdateDependencies = await npmRunner.getDependencyTree(searchedTreeDepth, true);
	if (isDebug) {
		console.log('Pre update dependencies:');
		console.log(preUpdateDependencies);
	}

	// Perform npm update.
	console.log('Performing npm update...');
	const updateOutput = await npmRunner.performNpmUpdate();
	if (isDebug) {
		console.log('Performed update. Output:');
		console.log(updateOutput);
	}

	// Fetch new dependency tree (post update).
	console.log('Fetching current dependencies (after updating)...');
	const postUpdateDependencies = await npmRunner.getDependencyTree(searchedTreeDepth, true);
	if (isDebug) {
		console.log('Post update dependencies:');
		console.log(postUpdateDependencies);
	}

	const packageListDiffs = comparePackageListsRecursively(preUpdateDependencies, postUpdateDependencies);

	console.log('Update successfully finished. Update output:');
	console.log(updateOutput);

	// Iterate over all collected packageListDiffs and reduce them to the needed info.
	let diffString = '';
	for (packageListDiff of packageListDiffs) {
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
				+ packageListDiff.parentPackagesNames.concat([packageListDiff.packageName]).join(' -> ')
				+ ')';
		}

		if (packageListDiff.wasAdded) {
			addToDiffString += '\n';
			addToDiffString += '\t* Was added.\n';
			addToDiffString += '\t* Has ' + packageListDiff.directDependenciesCount + ' direct dependencies.';
		}

		if (packageListDiff.wasRemoved) {
			addToDiffString += '\n';
			addToDiffString += '\t* Was removed.\n';
			addToDiffString += '\t* Had ' + packageListDiff.directDependenciesCount + ' direct dependencies.';
		}

		if (packageListDiff.previousVersion !== packageListDiff.newVersion) {
			addToDiffString += '\n';
			addToDiffString += '\t* Was updated.\n';
			addToDiffString += '\t* ' + packageListDiff.previousVersion + ' => ' + packageListDiff.newVersion;
		}

		diffString += addToDiffString;
	}

	console.log('The following dependencies were changed:');
	console.log(diffString || 'Nothing has changed!');
}

main();
