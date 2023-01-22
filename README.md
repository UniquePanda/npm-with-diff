# npm-with-diff
Use this instead of `npm` to get a readable diff of the dependency trees from before and after the execution of an npm command.

## Output
The diff is based on a comparison of the dependency tree that was collected before the command ran and the dependency tree that was collected after the command ran.  
Internally it utilizes the `npm ls` command.  
After a call to `npm update` the produced diff may look like this:  
```
The following dependencies were changed:
package-1
    * Was updated.
    * 2.3.2 -> 2.5.0
package-4 (package-1 -> package-2 -> package-3 -> *package-4*)
    * Was added.
    * Has 2 direct dependencies (not listed here).
package-2b (package-1 -> *package-2b*)
    * Was removed.
    * Had 1 direct dependencies (not listed here).
```

This output tells you what packages have changed after the `npm update` command was run.  
In this case three things changed:  
* The package with name `package-1` has been updated to a new version. The previous version was `2.3.2`, the new version is `2.5.0`.
  * This package is a top-level package (not nested under other dependencies).
* The package with name `package-4` has been added. With it 2 more dependencies were added (as dependencies of `package-4`).
  * This package is a nested dependency (of `package-3`, which is a dependency of `package-2`, which is a dependency of `package-1`).
  * The dependencies of `package-4` are not listed in the diff and may contain new dependencies themselves. Future versions of `npm-with-diff` may also list these new nested dependencies as "added".
* The package with name `package-2b` was removed.
  * It is a nested dependency (of `package-1`).
  * It had one direct dependency, which is not listed in the diff and may contained dependencies itself. Future versions of `npm-with-diff` may also list these nested dependencies as "removed".

If no dependencies were updated, added or removed, the output will simply look like this:  
```
The following dependencies were changed:
No dependencies were changed!
```

## Usage
### Installation
Run the following to install `npm-with-diff` as a dev dependency.  
```
npm install --save-dev npm-with-diff
```

**Note: I highly recommend to only use this package in development environments. There should be no need to use it in production and it is not tested for such use cases. If you run it in production, you do it on your own risk.**

*This package is intended to make your life a bit easier when navigating the npm dependency hell.  
All of its dependencies are only needed for development (only "devDependencies"), so it will only add itself to your `node_modules` directory and nothing more.*

### Run commands with diff
To use this package, you simply run the same npm commands as before, but instead of `npm` you call `npx npm-with-diff`.  
For example, to update your packages you can now call:  
```
npx npm-with-diff update
```

This will run `npm update` and then shows an output similar to the one that is described above.

You can also run `npm` without any command. Simply pass the flags to `npm-with-diff`.  
For example, to to get the npm version, run:  
```
npx npm-with-diff -v
```

### Pass arguments to the command
You can also pass in any argument to the command as you would normally do. You simply add the arguments behind the command.  
For example, if you want to run `npm update` with the `--save` flag, run:
```
npx npm-with-diff update --save
```

### Pass arguments to the `npm-with-diff` script
There are some arguments that you can pass to the `npm-with-diff` script itself.  
To make sure they are not confused with the npm commands and argument, you need to pass them before any npm command/arguments and then add a double dash (`--`).  
For example, if you want to pass the `--exclude-dev` flag to `npm-with-diff` and then run `npm update --save` through the script, run:  
```
npx npm-with-diff --exclude-dev -- update --save
```

As seen above, if you do not provide any double dash (`--`), `npm-with-diff` will assume that you didn't add any arguments for the script and will intepret the whole input as an npm command with arguments.

### Available arguments for  `npm-with-diff`
| Argument/Flag  | Description |
| ------------- | ------------- |
| --force / -f  | Force execution of the given `npm` command, even when `npm-with-diff` can't find it in the available commands. |
| --exclude-dev  | Exclude all dev dependencies from the diff.<br>This has no effect on the `npm` command you run! E.g. `npm update` will still update dev dependencies, but they will not be shown in the diff afterwards. |
| --searchedTreeDepth=<value>  | The depth to which `npm-with-diff` will search the dependency tree. Default: 10.<br>This is equivalent to the `depth` argument of `npm ls`. |

## Caveats
Currently it is not possible to use `npm-with-diff` after you manually edited your `package.json`.  
This is because the script internally uses `npm ls` which unfortunately will throw an error when the content of your `package.json` doesn't fit the content of your `package-lock.json` or `node_modules` folder.  
There might be a workaround for this in the future, but for now, you have to install/update packages via the CLI and not by editing your `package.json`.
