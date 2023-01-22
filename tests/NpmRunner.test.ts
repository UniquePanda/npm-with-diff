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
	it('resolves with correct return value', async () => {
		runNpmProcessMock.mockImplementation((npmCommand: string) => {
			return new Promise((resolve) => {
				resolve({ stdout: 'mocked-npm-update-return-string', stderr: null });
			});
		});

		expect(npmRunner.runNpmCommand('update',)).resolves.toBe('mocked-npm-update-return-string')

		expect(runNpmProcessMock).toHaveBeenCalledTimes(1);
		expect(runNpmProcessMock).toHaveBeenCalledWith('update', []);
	});

	it('rejects when stderr is present', async () => {
		runNpmProcessMock.mockImplementation((npmCommand: string) => {
			return new Promise((resolve) => {
				resolve({ stdout: 'mocked-npm-version-string', stderr: 'some error string!' });
			});
		});

		expect(npmRunner.runNpmCommand('', ['-v'])).rejects.toEqual(
			new Error('Error running "npm -v": some error string!')
		);

		expect(runNpmProcessMock).toHaveBeenCalledTimes(1);
		expect(runNpmProcessMock).toHaveBeenCalledWith('', ['-v']);
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

		expect(npmRunner.runNpmCommand('', ['-v'])).rejects.toEqual(
			new Error('Error running npm process (code 99): Some process error!')
		);

		expect(runNpmProcessMock).toHaveBeenCalledTimes(1);
		expect(runNpmProcessMock).toHaveBeenCalledWith('', ['-v']);
	});
});

describe('getNpmVersion', () => {
	it('correctly calls runNpmCommand', () => {
		const runNpmCommandMock = jest.spyOn(npmRunner, 'runNpmCommand')
			.mockImplementation((command) => Promise.resolve(command));

		npmRunner.getNpmVersion();

		expect(runNpmCommandMock).toHaveBeenCalledTimes(1);
		expect(runNpmCommandMock).toHaveBeenCalledWith('', ['-v']);
	});
});

describe('getDependencyTree', () => {
	it('correctly calls runNpmCommand', () => {
		const runNpmCommandMock = jest.spyOn(npmRunner, 'runNpmCommand')
			.mockImplementation((command) => Promise.resolve('{}'));

		npmRunner.getDependencyTree();

		expect(runNpmCommandMock).toHaveBeenCalledTimes(1);
		expect(runNpmCommandMock).toHaveBeenCalledWith('ls', ['--all', '--json', '--depth=0']);
	});

	it('correctly calls runNpmCommand with different input', () => {
		const runNpmCommandMock = jest.spyOn(npmRunner, 'runNpmCommand')
			.mockImplementation((command) => Promise.resolve('{}'));

		npmRunner.getDependencyTree(5, true); // depth 5, no --omit=dev

		expect(runNpmCommandMock).toHaveBeenCalledTimes(1);
		expect(runNpmCommandMock).toHaveBeenCalledWith('ls', ['--all', '--json', '--depth=5']);
	});

	it('correctly parses returned string', () => {
		const mockedDependencyTree = {
			version: '1.0.0',
			name: 'npm-run-diff',
			dependencies: {
				'dep-level-1-1': {
					version: '1.5.0',
					resolved: '',
					overriden: false,
					dependencies: {
						'dep-level-2-1': {
							version: '1.6.0',
							resolved: '',
							overriden: false,
						},
						'dep-level-2-2': {
							version: '1.7.0',
							resolved: '',
							overriden: false,
						},
					},
				},
				'dep-level-1-2': {
					version: '2.0.5',
					resolved: '',
					overriden: false,
					dependencies: {
						'dep-level-2-3': {
							version: '2.1.5',
							resolved: '',
							overriden: false,
						},
						'dep-level-2-4': {
							version: '2.2.5',
							resolved: '',
							overriden: false,
						},
					},
				},
			}
		};

		const dependenciesMapDepLevel1_1 = new Map();
		dependenciesMapDepLevel1_1.set(
			'dep-level-2-1',
			{
				version: '1.6.0',
				resolved: '',
				overriden: false,
			}
		);
		dependenciesMapDepLevel1_1.set(
			'dep-level-2-2',
			{
				version: '1.7.0',
				resolved: '',
				overriden: false,
			}
		);
		const dependenciesMapDepLevel1_2 = new Map();
		dependenciesMapDepLevel1_2.set(
			'dep-level-2-3',
			{
				version: '2.1.5',
				resolved: '',
				overriden: false,
			}
		);
		dependenciesMapDepLevel1_2.set(
			'dep-level-2-4',
			{
				version: '2.2.5',
				resolved: '',
				overriden: false,
			}
		);
		const expectedReturn = new Map();
		expectedReturn.set(
			'dep-level-1-1',
			{
				version: '1.5.0',
				resolved: '',
				overriden: false,
				dependencies: dependenciesMapDepLevel1_1,
			}
		);
		expectedReturn.set(
			'dep-level-1-2',
			{
				version: '2.0.5',
				resolved: '',
				overriden: false,
				dependencies: dependenciesMapDepLevel1_2,
			}
		);

		const runNpmCommandMock = jest.spyOn(npmRunner, 'runNpmCommand')
			.mockImplementation(
				(command) => Promise.resolve(JSON.stringify(mockedDependencyTree))
			);

		expect(npmRunner.getDependencyTree()).resolves.toEqual(expectedReturn);

		expect(runNpmCommandMock).toHaveBeenCalledTimes(1);
		expect(runNpmCommandMock).toHaveBeenCalledWith('ls', ['--all', '--json', '--depth=0']);
	});
});
