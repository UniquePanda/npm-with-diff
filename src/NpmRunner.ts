import { exec, ExecException } from 'node:child_process';
import { NpmPackageList, NpmPackageListEntry } from './Interfaces';

export class NpmRunner {
	runNpmCommand(command: string, commandArguments: Array<string> = []): Promise<string> {
		return new Promise((resolve, reject) => {
			this.runNpmProcess(command, commandArguments)
				.then(({ stdout, stderr }) => {
					if (stderr) {
						reject(new Error(
							'Error running "npm' + (command.length > 0 ? ' ' : '')
							+ command
							+ this.getCommandArgumentsAsJoinedString(commandArguments)
							+ '": ' + stderr
						));
					}

					resolve(stdout);
				})
				.catch((error: ExecException) => {
					reject(new Error('Error running npm process (code ' + error.code + '): ' + error.message));
				});
		});
	}

	getNpmVersion(): Promise<string> {
		return this.runNpmCommand('', ['-v']);
	}

	getAvailableNpmCommands(): Promise<Array<string>> {
		return new Promise((resolve, reject) => {
			// I didn't find a nicer way to get a list of all npm commands other than getting them from the help text.
			// This only works as long as there is "All commands:\n\n" in front of the command list and "\n\n" after it.
			this.runNpmCommand('help')
				.then((output) => {
					const commandsString = output
						// Get everything after "introduction" line.
						.split('All commands:\n\n').pop()
						// Get everything of that before the empty line.
						?.split('\n\n')[0]
						// Remove all whitespace.
						.replace(/\s/g, '');

					if (!commandsString) {
						return [];
					}

					resolve(commandsString.split(','));
				})
				.catch((error) => reject(error));
		});
	}

	getDependencyTree(depth: number = 0, excludeDevDpendencies: boolean = false): Promise<Map<string, NpmPackageListEntry>> {
		return new Promise((resolve, reject) => {
			// List dependencies in JSON format up to configured depth. If depth is 0 only top-level packages are
			// included (direct dependencies of this project).
			const commandArguments = ['--all', '--json', '--depth=' + depth];

			if (excludeDevDpendencies) {
				commandArguments.push('--omit=dev');
			}

			this.runNpmCommand('ls', commandArguments)
				.then((output) => {
					// Parse the returned JSON string and transform all dependencies into a map.
					const outputObject: NpmPackageList = JSON.parse(output, (key, value) => {
						if (key == 'dependencies') {
							return new Map(Object.entries(value));
						} else {
							return value;
						}
					});

					resolve(outputObject.dependencies || new Map());
				})
				.catch((error) => reject(error));
		});
	}

	private runNpmProcess(npmCommand: string, commandArguments: Array<string> = []): Promise<{stdout: string, stderr: string}> {
		return new Promise((resolve, reject) => {
			exec(
				'npm ' + npmCommand + this.getCommandArgumentsAsJoinedString(commandArguments),
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

	private getCommandArgumentsAsJoinedString(commandArguments: Array<string>): string {
		if (!commandArguments || commandArguments.length === 0) {
			return '';
		}

		// Add a space in front of argument string to make it ready to use directly after the command name.
		return ' ' + commandArguments.join(' ');
	}
}
