import { exec, ExecException } from 'node:child_process';

interface NpmPackageList {
	version: string,
	name: string,
	dependencies: NpmPackageListEntries,
}

interface NpmPackageListEntries {
	[packageName: string]: NpmPackageListEntry;
}

interface NpmPackageListEntry {
	version: string,
	resolved: string,
	overridden: boolean,
}

export class NpmRunner {
	runNpmCommand(command: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.runNpmProcess(command)
				.then(({ stdout, stderr }) => {
					if (stderr) {
						reject(new Error('Error running "npm ' + command + '": ' + stderr));
					}

					resolve(stdout);
				})
				.catch((error: ExecException) => {
					reject(new Error('Error running npm process (code ' + error.code + '): ' + error.message));
				});
		});
	}

	getNpmVersion(): Promise<string> {
		return this.runNpmCommand('-v');
	}

	getDependencyTree(depth: number = 0, onlyTopLevel: boolean = false, includeDev: boolean = false): Promise<NpmPackageListEntries> {
		return new Promise((resolve, reject) => {
			let command = 'ls --json --depth=' + depth; // List dependencies in JSON format up to configured depth.
			if (!onlyTopLevel) {
				command += ' --all'; // Include all dependencies (not only top-level).
			}
			if (!includeDev) {
				command += ' --omit=dev'; // Exclude dev dependencies.
			}

			this.runNpmCommand(command)
				.then((output) => {
					const outputObject: NpmPackageList = JSON.parse(output);

					resolve(outputObject.dependencies || {});
				})
				.catch((error) => reject(error));
		});
	}

	private runNpmProcess(npmCommand: string): Promise<{stdout: string, stderr: string}> {
		return new Promise((resolve, reject) => {
			exec(
				'npm ' + npmCommand,
				(error, stdout, stderr) => {
					if (error) {
						reject(error);
						return;
					}

					resolve({
						stdout: stdout,
						stderr: stderr,
					});
				}
			);
		});
	}
}
