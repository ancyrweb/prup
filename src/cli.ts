#!/usr/bin/env node
import { program } from "commander";
import * as fs from "fs";
import chalk from "chalk";
import * as path from "path";
import child_process from "child_process";
import process from "process";

import {
  addProject,
  addRemote,
  createFileContent,
  executeRemote,
  generateConfigContent,
  getAppKey,
  getProjects,
  getRemotes,
  removeRemote,
} from "./core";

import { sendIPCCommand } from "./ipc-server";

program.version("0.0.1");
program
  .command("build [directory]", { isDefault: true })
  .description("Build the project in the specified directory")
  .action(async (nameOrDirectory) => {
    try {
      if (nameOrDirectory) {
        if (!fs.existsSync(nameOrDirectory)) {
          throw new Error("Directory " + nameOrDirectory + " doesn't exist.");
        }
        await executeRemote(nameOrDirectory);
      } else {
        await executeRemote(process.cwd());
      }
      console.log(chalk.green("Build done !"));
    } catch (e) {
      console.error(chalk.red("Could not build : " + e.message));
    }
  });

const projects = program.command("projects").description("Manage projects");

projects
  .command("add <name>")
  .description("Add a project")
  .option("-d,--directory <directory>", "Directory")
  .action((name, opts) => {
    addProject(name, opts.directory || process.cwd());
  });
projects
  .command("list")
  .description("List the projects")
  .action(() => {
    const directories = getProjects();
    Object.keys(directories).map((name) => {
      console.log("[" + chalk.red(name) + "]");
      console.log("Key : " + directories[name].key);
      console.log("Path : " + directories[name].path);
    });
  });

projects
  .command("create-config <remote> <project>")
  .description(
    "Create a prup.config.js file ready to be used. The project must exist on the pu server."
  )
  .action((remote, project, opts) => {
    createFileContent(remote, project);
  });

projects
  .command("dump-config <remote> <project>")
  .description(
    "Dump the content of what a prup.config.js file should look like for the project"
  )
  .action(async (remote, project) => {
    console.log(chalk.green(await generateConfigContent(remote, project)));
  });

const remotes = program.command("remotes").description("Manage remote URLs");

remotes
  .command("list")
  .description("List the remotes")
  .action(() => {
    const remotes = getRemotes();
    Object.keys(remotes).map((name) => {
      console.log("[" + chalk.red(name) + "]");
      console.log("Key : " + remotes[name].key);
      console.log("Host : " + remotes[name].host);
      console.log("Port : " + remotes[name].port);
    });
  });
remotes
  .command("add <alias> <host> <port> <key>")
  .description("Add the remote")
  .action((alias, host, port, key) => {
    addRemote(alias, { host, port, key });
  });

remotes
  .command("remove <alias>")
  .description("Remove the remote")
  .action((alias) => {
    removeRemote(alias);
  });

const server = program.command("server").description("Manage HTTP server");

server
  .command("start")
  .description("Start the server")
  .option("-p,--port <port>", "The port the server should bind to")
  .action(async (opts) => {
    let isRunning = false;
    try {
      await sendIPCCommand({
        key: getAppKey(),
        command: "healthcheck",
      });
      isRunning = true;
    } catch (e) {}

    if (isRunning) {
      console.error(
        chalk.red("Could not start the server : server is already running.")
      );
      return;
    }

    try {
      const child = child_process.spawn(
        "node",
        [path.resolve(__dirname, "start-ipc-server.js")],
        {
          detached: true,
          stdio: "ignore",
        }
      );

      child.unref();
    } catch (e) {
      console.error(chalk.red("Could not start the server : " + e.message));
    }
  });

server
  .command("stop")
  .description("Stops the server")
  .option("-p,--port <port>", "The port the server should be bound to")
  .action(async (opts) => {
    try {
      await sendIPCCommand({
        key: getAppKey(),
        command: "stop",
      });
      console.log(chalk.green("Server have been shutdown"));
    } catch (e) {
      if (e.errno === "ECONNREFUSED") {
        console.error(chalk.green("The server is already shutdown."));
        return;
      }

      console.error(chalk.red("Could not shutdown the server : " + e.message));
    }
  });

server
  .command("healthcheck")
  .description("Get info about the server")
  .action(async () => {
    try {
      const result = await sendIPCCommand({
        key: getAppKey(),
        command: "healthcheck",
      });

      if (result.result !== "healthy") {
        console.error(chalk.red("Server is unhealthy."));
      } else {
        console.log(chalk.green("Server is healthy."));
      }
    } catch (e) {
      console.error(chalk.red("Could not shutdown the server : " + e.message));
    }
  });

program.parse(process.argv);
