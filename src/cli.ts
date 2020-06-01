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
  safeGetProject,
} from "./core";

import { sendIPCCommand } from "./ipc-server";
import { logError, logSuccess } from "./utils";
import { printHowToAddProject } from "./cli-utils";

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
      logSuccess("Build done !");
    } catch (e) {
      logError("Could not build : " + e.message);
    }
  });

const projects = program.command("projects").description("Manage projects");

projects
  .command("add <name>")
  .description("Add a project")
  .option("-d,--directory <directory>", "Directory")
  .action((name, opts) => {
    addProject(name, opts.directory || process.cwd());
    logSuccess("Your project have been created !");
    console.log(
      "You can now bind it on your local machine. Here's how to do it."
    );
    console.log("");
    printHowToAddProject(name);
  });

projects
  .command("print-install-steps <name>")
  .description("Print how to configure the project in your local machine")
  .action((name) => {
    safeGetProject(name);
    printHowToAddProject(name);
  });

projects
  .command("list")
  .description("List the projects")
  .action(() => {
    const directories = getProjects();
    Object.keys(directories).map((name) => {
      console.log(chalk.green("[" + name + "]"));
      console.log("Key : " + chalk.bold(directories[name].key));
      console.log("Path : " + chalk.bold(directories[name].path));
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
    try {
      const result = await generateConfigContent(remote, project);
      logSuccess(result);
    } catch (e) {
      logError(e.message);
    }
  });

const remotes = program.command("remotes").description("Manage remote URLs");

remotes
  .command("list")
  .description("List the remotes")
  .action(() => {
    const remotes = getRemotes();
    Object.keys(remotes).map((name) => {
      console.log(chalk.green("[" + name + "]"));
      console.log("Key : " + chalk.bold(remotes[name].key));
      console.log("Host : " + chalk.bold(remotes[name].host));
      console.log("Port : " + chalk.bold(remotes[name].port));
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
      logError("Could not start the server : server is already running.");
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
      logError("Could not start the server : " + e.message);
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
      logSuccess("Server have been shutdown");
    } catch (e) {
      if (e.errno === "ECONNREFUSED") {
        logError("The server is not running.");
        return;
      }

      logError("Could not shutdown the server : " + e.message);
    }
  });

server
  .command("healthcheck")
  .description("Get healthcheck info about the server")
  .action(async () => {
    try {
      const result = await sendIPCCommand({
        key: getAppKey(),
        command: "healthcheck",
      });

      if (result.result !== "healthy") {
        logError("Server is unhealthy.");
      } else {
        logSuccess("Server is healthy.");
      }
    } catch (e) {
      logError("Could not get healthcheck informations : " + e.message);
    }
  });

server
  .command("info")
  .description("Get info about the server")
  .action(async () => {
    console.log(chalk.greenBright("[Server]"));
    console.log("Key : " + chalk.bold(getAppKey()));
  });

program.parse(process.argv);
