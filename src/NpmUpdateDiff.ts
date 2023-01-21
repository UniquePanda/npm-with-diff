import { NpmPackageListEntry, PackageListDiff } from './Interfaces';
import { NpmRunner } from './NpmRunner';

export class NpmUpdateDiff {
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
		if (newPackageListEntries) {
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

	async performUpdateWithDiff(searchedTreeDepth: number) {
		const npmRunner = new NpmRunner();

		// Fetch current dependency tree (pre update).
		console.log('Fetching current dependencies (before updating)...');
		const preUpdateDependencies = await npmRunner.getDependencyTree(searchedTreeDepth, true);
		if (this.isDebug) {
			console.log('Pre update dependencies:');
			console.log(preUpdateDependencies);
		}

		// Perform npm update.
		console.log('Performing npm update...');
		const updateOutput = await npmRunner.performNpmUpdate();
		if (this.isDebug) {
			console.log('Performed update. Output:');
			console.log(updateOutput);
		}

		// Fetch new dependency tree (post update).
		console.log('Fetching current dependencies (after updating)...');
		const postUpdateDependencies = await npmRunner.getDependencyTree(searchedTreeDepth, true);
		if (this.isDebug) {
			console.log('Post update dependencies:');
			console.log(postUpdateDependencies);
		}

		const packageListDiffs = this.comparePackageListsRecursively(preUpdateDependencies, postUpdateDependencies);

		console.log('Update successfully finished. Update output:');
		console.log(updateOutput);

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

		console.log('The following dependencies were changed:');
		console.log(diffString || 'Nothing has changed!');
	}
}
