export interface NpmPackageList {
	version: string,
	name: string,
	dependencies: Map<string, NpmPackageListEntry>,
}

export interface NpmPackageListEntry {
	version: string,
	resolved: string,
	overridden: boolean,
	dependencies?: Map<string, NpmPackageListEntry>,
}

export interface PackageListDiff {
    packageName: string,
    parentPackagesNames: Array<string>,
    directDependenciesCount: number,
    wasAdded: boolean,
    wasRemoved: boolean,
    previousVersion: string|null,
    newVersion: string|null,
}
