import { program } from "commander";
import * as fs from "fs";
import chalk from 'chalk';

import {
  addProject,
  addRemote,
  createFileContent,
  executeRemote, generateConfigContent,
  getProjects,
  getRemotes,
  removeRemote
} from "./core";

program.version('0.0.1');
program
  .command('build [directory]', { isDefault: true })
  .description('Build the project in the specified directory')
  .action((nameOrDirectory) => {
    if (nameOrDirectory) {
      if (!fs.existsSync(nameOrDirectory)) {
        throw new Error("Directory " + nameOrDirectory + " doesn't exist.");
      }
      executeRemote(nameOrDirectory);
    } else {
      executeRemote(process.cwd());
    }

  });

const projects = program
  .command('projects')
  .description('Manage projects');

projects
  .command('add <name>')
  .description('Add a project')
  .option('-d,--directory <directory>', 'Directory')
  .action((name, opts) => {
    addProject(name, opts.directory || process.cwd())
  })
projects
  .command('list')
  .description('List the projects')
  .action(() => {
    const directories = getProjects();
    Object.keys(directories).map(name => {
      console.log("[" + chalk.red(name) + "]");
      console.log("Key : " + directories[name].key);
      console.log("Path : " + directories[name].path);
    })
  })

projects
  .command('create-config <remote> <project>')
  .description('Create a pu.config.js file ready to be used. The project must exist on the pu server.')
  .action((remote, project, opts) => {
    createFileContent(remote, project)
  })

projects
  .command('dump-config <remote> <project>')
  .description('Dump the content of what a pu.config.js file should look like for the project')
  .action(async (remote, project) => {
    console.log(chalk.green(await generateConfigContent(remote, project)));
  })

const remotes = program
  .command('remotes')
  .description("Manage remote URLs")

remotes
  .command('list')
  .description('List the remotes')
  .action(() => {
    const remotes = getRemotes();
    Object.keys(remotes).map(name => {
      console.log("[" + chalk.red(name) + "]");
      console.log("Key : " + remotes[name].key);
      console.log("URL : " + remotes[name].url);
    })
  })
remotes
  .command('add <alias> <url> <key>')
  .description('Add the remote')
  .action((alias, url, key) => {
    addRemote(alias, url, key);
  })

remotes
  .command('remove <alias>')
  .description('Remove the remote')
  .action((alias) => {
    removeRemote(alias);
  })

program.parse(process.argv);
