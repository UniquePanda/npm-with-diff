import { ExecException } from 'node:child_process';
import { NpmRunner } from '../src/NpmRunner';

let npmRunner: NpmRunner;
let runNpmProcessMock: jest.SpyInstance<any>;

beforeEach(() => {
	npmRunner = new NpmRunner();

	// "as any" to mock private function.
	runNpmProcessMock = jest.spyOn(npmRunner as any, 'runNpmProcess');
});

describe('runNpmCommand', () => {
	it('resolves with correct npm version string', async () => {
		runNpmProcessMock.mockImplementation((npmCommand: string) => {
			return new Promise((resolve) => {
				resolve({ stdout: 'mocked-npm-version-string', stderr: null });
			});
		});

		expect(npmRunner.runNpmCommand('-v')).resolves.toBe('mocked-npm-version-string')

		expect(runNpmProcessMock).toHaveBeenCalledTimes(1);
		expect(runNpmProcessMock).toHaveBeenCalledWith('-v');
	});

	it('rejects when stderr is present', async () => {
		runNpmProcessMock.mockImplementation((npmCommand: string) => {
			return new Promise((resolve) => {
				resolve({ stdout: 'mocked-npm-version-string', stderr: 'some error string!' });
			});
		});

		expect(npmRunner.runNpmCommand('-v')).rejects.toEqual(
			new Error('Error running "npm -v": some error string!')
		);

		expect(runNpmProcessMock).toHaveBeenCalledTimes(1);
		expect(runNpmProcessMock).toHaveBeenCalledWith('-v');
	});

	it('rejects in case of process error', async () => {
		runNpmProcessMock.mockImplementation((npmCommand: string) => {
			return new Promise((resolve, reject) => {
				const error = {} as ExecException;
				error.message = 'Some process error!';
				error.code = 99;
				reject(error);
			});
		});

		expect(npmRunner.runNpmCommand('-v')).rejects.toEqual(
			new Error('Error running npm process (code 99): Some process error!')
		);

		expect(runNpmProcessMock).toHaveBeenCalledTimes(1);
		expect(runNpmProcessMock).toHaveBeenCalledWith('-v');
	});
});

describe('getNpmVersion', () => {
	it('correctly calls runNpmCommand', () => {
		const runNpmCommandMock = jest.spyOn(npmRunner, 'runNpmCommand');

		npmRunner.getNpmVersion();

		expect(runNpmCommandMock).toHaveBeenCalledTimes(1);
		expect(runNpmCommandMock).toHaveBeenCalledWith('-v');
	});
});
