import { exec, ExecException } from 'node:child_process';

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
