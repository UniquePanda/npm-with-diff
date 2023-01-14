#! /usr/bin/env node

const NpmRunner = require('../lib/NpmRunner').NpmRunner;

const npmRunner = new NpmRunner();

npmRunner.getNpmVersion().then((version) => console.log(version));
