import { NpmPackageListEntry } from '../src/Interfaces';
import { NpmUpdateDiff } from '../src/NpmUpdateDiff';
import { NpmRunner } from '../src/NpmRunner';

let npmUpdateDiff: NpmUpdateDiff;

beforeEach(() => {
	npmUpdateDiff = new NpmUpdateDiff(false);
});

describe('comparePackageListsRecursively', () => {
	const defaultListEntry = {
		version: '1.0.0',
		resolved: '',
		overridden: false,
		dependencies: new Map<string, NpmPackageListEntry>(),
	};

	let oldPackageListEntries: Map<string, NpmPackageListEntry>;
	let newPackageListEntries: Map<string, NpmPackageListEntry>;

	beforeEach(() => {
		oldPackageListEntries = new Map<string, NpmPackageListEntry>();
		newPackageListEntries = new Map<string, NpmPackageListEntry>();
	});

	it('returns empty array when no old package list entries', () => {
		// "as any" to test private function
		expect((npmUpdateDiff as any).comparePackageListsRecursively(oldPackageListEntries, newPackageListEntries))
			.toStrictEqual([]);
	});

	it('correctly handles removed packages', () => {
		oldPackageListEntries.set(
			'package-level-1-1',
			{
				...defaultListEntry,
				dependencies: new Map(
					[['package-level-2-1', { ...defaultListEntry }], ['package-level-2-2', { ...defaultListEntry }]]
				),
			}
		);

		// "as any" to test private function
		expect((npmUpdateDiff as any).comparePackageListsRecursively(oldPackageListEntries, newPackageListEntries))
			.toStrictEqual([
				{
					packageName: 'package-level-1-1',
					parentPackagesNames: [],
					directDependenciesCount: 2,
					wasAdded: false,
					wasRemoved: true,
					previousVersion: '1.0.0',
					newVersion: null,
				}
			]);
	});

	it('correctly handles added packages', () => {
		oldPackageListEntries.set(
			'package-level-1-1',
			{
				...defaultListEntry,
			}
		);
		newPackageListEntries.set(
			'package-level-1-1',
			{
				...defaultListEntry,
				dependencies: new Map(
					[['package-level-2-1', { ...defaultListEntry }], ['package-level-2-2', { ...defaultListEntry }]]
				),
			}
		);

		// "as any" to test private function
		expect((npmUpdateDiff as any).comparePackageListsRecursively(oldPackageListEntries, newPackageListEntries))
			.toStrictEqual([
				{
					packageName: 'package-level-1-1',
					parentPackagesNames: [],
					directDependenciesCount: 0,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-2-1',
					parentPackagesNames: ['package-level-1-1'],
					directDependenciesCount: 0,
					wasAdded: true,
					wasRemoved: false,
					previousVersion: null,
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-2-2',
					parentPackagesNames: ['package-level-1-1'],
					directDependenciesCount: 0,
					wasAdded: true,
					wasRemoved: false,
					previousVersion: null,
					newVersion: '1.0.0',
				}
			]);
	});

	it('correctly handles different versions', () => {
		oldPackageListEntries.set(
			'package-level-1-1',
			{
				...defaultListEntry,
			}
		);
		newPackageListEntries.set(
			'package-level-1-1',
			{
				...defaultListEntry,
				version: '1.5.2',
			}
		);

		// "as any" to test private function
		expect((npmUpdateDiff as any).comparePackageListsRecursively(oldPackageListEntries, newPackageListEntries))
			.toStrictEqual([
				{
					packageName: 'package-level-1-1',
					parentPackagesNames: [],
					directDependenciesCount: 0,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.5.2',
				}
			]);
	});

	it('correctly stores parent packages and direct dependencies count', () => {
		oldPackageListEntries.set(
			'package-level-1-1',
			{
				...defaultListEntry,
				dependencies: new Map(
					[
						[
							'package-level-2-1',
							{
								...defaultListEntry,
								dependencies: new Map(
									[
										[
											'package-level-3-1',
											{
												...defaultListEntry,
												dependencies: new Map(
													[
														[
															'package-level-4-1',
															{
																...defaultListEntry,
															}
														]
													]
												),
											},
										],
										[
											'package-level-3-2',
											{
												...defaultListEntry,
												dependencies: new Map(
													[
														[
															'package-level-4-2',
															{
																...defaultListEntry,
															}
														]
													]
												),
											},
										]
									]
								),
							}
						]
					]
				),
			}
		);
		newPackageListEntries = new Map(oldPackageListEntries);

		// "as any" to test private function
		expect((npmUpdateDiff as any).comparePackageListsRecursively(oldPackageListEntries, newPackageListEntries))
			.toStrictEqual([
				{
					packageName: 'package-level-1-1',
					parentPackagesNames: [],
					directDependenciesCount: 1,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-2-1',
					parentPackagesNames: ['package-level-1-1'],
					directDependenciesCount: 2,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-3-1',
					parentPackagesNames: ['package-level-1-1', 'package-level-2-1'],
					directDependenciesCount: 1,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-4-1',
					parentPackagesNames: ['package-level-1-1', 'package-level-2-1', 'package-level-3-1'],
					directDependenciesCount: 0,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-3-2',
					parentPackagesNames: ['package-level-1-1', 'package-level-2-1'],
					directDependenciesCount: 1,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
				{
					packageName: 'package-level-4-2',
					parentPackagesNames: ['package-level-1-1', 'package-level-2-1', 'package-level-3-2'],
					directDependenciesCount: 0,
					wasAdded: false,
					wasRemoved: false,
					previousVersion: '1.0.0',
					newVersion: '1.0.0',
				},
			]);
	});

	describe('performUpdateWithDiff', () => {
		it('Correctly prints diff after update', async () => {
			oldPackageListEntries.set(
				'package-level-1-1',
				{
					...defaultListEntry,
					dependencies: new Map(
						[
							[
								'package-level-2-1',
								{
									...defaultListEntry,
									dependencies: new Map(
										[
											[
												'package-level-3-1',
												{
													...defaultListEntry,
													dependencies: new Map(
														[
															[
																'package-level-4-1',
																{
																	...defaultListEntry,
																},
															],
														]
													),
												},
											],
										]
									),
								}
							]
						]
					),
				}
			);

			newPackageListEntries.set(
				'package-level-1-1',
				{
					...defaultListEntry,
					dependencies: new Map(
						[
							[
								'package-level-2-1',
								{
									...defaultListEntry,
									version: '2.0.0',
								},
							],
							[
								'package-level-2-2',
								{
									...defaultListEntry,
									dependencies: new Map(
										[
											[
												'package-level-3-2',
												{
													...defaultListEntry,
												},
											],
										]
									),
								},
							]
						]
					),
				}
			);
			newPackageListEntries.set(
				'package-level-1-2',
				{
					...defaultListEntry,
					dependencies: new Map(
						[
							[
								'package-level-2-3',
								{
									...defaultListEntry,
								},
							],
							[
								'package-level-2-4',
								{
									...defaultListEntry,
									dependencies: new Map(
										[
											[
												'package-level-3-3',
												{
													...defaultListEntry,
												},
											],
										]
									),
								},
							],
						]
					),
				}
			);
			jest.spyOn(NpmRunner.prototype, 'getDependencyTree')
				.mockReturnValueOnce(Promise.resolve(oldPackageListEntries))
				.mockReturnValueOnce(Promise.resolve(newPackageListEntries));
			jest.spyOn(NpmRunner.prototype, 'performNpmUpdate')
				.mockReturnValue(Promise.resolve('Mocked update output'));
			const consoleLogSpy = jest.spyOn(console, 'log')
				.mockImplementation(() => {}); // Mutes the console logs when running the test.

			await npmUpdateDiff.performUpdateWithDiff(2);

			expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'Fetching current dependencies (before updating)...');
			expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'Performing npm update...');
			expect(consoleLogSpy).toHaveBeenNthCalledWith(3, 'Fetching current dependencies (after updating)...');
			expect(consoleLogSpy).toHaveBeenNthCalledWith(4, 'Update successfully finished. Update output:');
			expect(consoleLogSpy).toHaveBeenNthCalledWith(5, 'Mocked update output');
			expect(consoleLogSpy).toHaveBeenNthCalledWith(6, 'The following dependencies were changed:');
			expect(consoleLogSpy).toHaveBeenNthCalledWith(
				7,
				'package-level-1-2\n'
				+ '\t* Was added.\n'
				+ '\t* Has 2 direct dependencies (not listed here).\n'
				+ 'package-level-2-2 (package-level-1-1 -> *package-level-2-2*)\n'
				+ '\t* Was added.\n'
				+ '\t* Has 1 direct dependencies (not listed here).\n'
				+ 'package-level-2-1 (package-level-1-1 -> *package-level-2-1*)\n'
				+ '\t* Was updated.\n'
				+ '\t* 1.0.0 => 2.0.0\n'
				+ 'package-level-3-1 (package-level-1-1 -> package-level-2-1 -> *package-level-3-1*)\n'
				+ '\t* Was removed.\n'
				+ '\t* Had 1 direct dependencies (not listed here).'
			);
		});
	});
});
