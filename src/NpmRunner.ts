import { exec, ExecException } from 'node:child_process';
import { NpmPackageList, NpmPackageListEntry } from './Interfaces';

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

	getDependencyTree(depth: number = 0, includeDev: boolean = false): Promise<Map<string, NpmPackageListEntry>> {
		return new Promise((resolve, reject) => {
			// List dependencies in JSON format up to configured depth. If depth is 0 only top-level packages are
			// included (direct dependencies of this project).
			let command = 'ls --all --json --depth=' + depth;

			if (!includeDev) {
				command += ' --omit=dev'; // Exclude dev dependencies.
			}

			this.runNpmCommand(command)
				.then((output) => {
					// Parse the returned JSON string and transform all dependencies into a map.
					const outputObject: NpmPackageList = JSON.parse(output, (key, value) => {
						if (key == 'dependencies') {
							return new Map(Object.entries(value));
						} else {
							return value;
						}
					});

					resolve(outputObject.dependencies || {});
				})
				.catch((error) => reject(error));
		});
	}

	performNpmUpdate(): Promise<string> {
		return new Promise((resolve, reject) => {
			this.runNpmCommand('update')
				.then((output) => {
					resolve(output);
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
