import * as crypto from "crypto";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as child from "child_process";
import { sendIPCCommand } from "./ipc-server";

type Project = {
  key: string;
  path: string;
};

type Remote = {
  key: string;
  host: string;
  port: number;
};

type Config = {
  key: string;
  projects: Record<string, Project>;
  remotes: Record<string, Remote>;
};

let defaultConfig: Config = {
  key: null,
  projects: {},
  remotes: {},
};

let config: Config = defaultConfig;

const homeFolder = os.homedir();
const configFolder = path.resolve(homeFolder, ".prup");
const configFile = path.resolve(configFolder, "config.json");

if (!fs.existsSync(configFolder)) {
  fs.mkdirSync(configFolder);
}

function safeGetRemote(alias: string): Remote {
  const remote = getRemotes()[alias];
  if (!remote) {
    throw new Error("Unrecognized remmote " + alias);
  }
  return remote;
}

export function getConfigFolder() {
  return configFolder;
}

export function getAppKey() {
  return config.key;
}

export function isAppKeyValid(key: string) {
  return key === config.key;
}

export function writeConfig() {
  fs.writeFileSync(configFile, JSON.stringify(config));
}

export function ensureDefaultConfig() {
  if (!fs.existsSync(configFile)) {
    config.key = crypto.randomBytes(48).toString("hex");
    writeConfig();
  } else {
    const result = fs.readFileSync(configFile);
    config = JSON.parse(result.toString());
    config = {
      ...defaultConfig,
      ...config,
    };
  }
}

export function execute(workingDirectory: string, commands: string[]) {
  console.log("In " + workingDirectory);
  for (let command of commands) {
    console.log("Executing `" + command + "`");
    const result = child.execSync(command, {
      cwd: workingDirectory,
    });
    console.log("Done executing `" + command + "`");
  }

  console.log("Pu is done building.");
}

export function executeForDirectory(workingDir: string) {
  const file = path.resolve(workingDir, "prup.config.js");
  if (!fs.existsSync(file)) {
    throw new Error("The file " + file + " doesn't exist.");
  }

  const result = require(file);
  return execute(workingDir, result.commands);
}

export function executeForName(name: string) {
  if (!config.projects[name]) {
    throw new Error("Project with name " + name + " isn't registered.");
  }

  return executeForDirectory(config.projects[name].path);
}

export function executeWithCommandsSafe(
  name: string,
  key: string,
  commands: string[]
) {
  if (!config.projects[name]) {
    throw new Error("Project with name " + name + " isn't registered.");
  }

  if (config.projects[name].key !== key) {
    throw new Error("Invalid key");
  }

  return execute(config.projects[name].path, commands);
}

export async function executeRemote(configPath: string) {
  const finalPath = path.resolve(configPath, "prup.config.js");
  if (!fs.existsSync(finalPath)) {
    throw new Error("Could not find prup.config.js inside " + configPath);
  }

  const data = require(finalPath);
  const remote = safeGetRemote(data.remoteAlias);

  return sendIPCCommand(
    {
      key: remote.key,
      command: "build",
      payload: {
        name: data.projectAlias,
        key: data.projectKey,
        commands: data.commands,
      },
    },
    remote.host,
    remote.port
  );
}

export function addProject(name: string, directory: string) {
  if (config.projects[name] && config.projects) {
    console.warn(
      "Project " +
        name +
        " is already defined with path " +
        directory +
        " and will be erased."
    );
  }

  config.projects[name] = {
    key: crypto.randomBytes(48).toString("hex"),
    path: directory,
  };
  writeConfig();
}

export function getProjects() {
  return config.projects;
}

export function getRemotes() {
  return config.remotes;
}

export function addRemote(
  alias: string,
  data: {
    host: string;
    port: number;
    key: string;
  }
) {
  const remote: Remote = data;

  if (config.remotes[alias]) {
    console.warn(
      "Remote " + name + " is already defined with path and will be erased."
    );
  }

  config.remotes[alias] = remote;
  writeConfig();
}

export function removeRemote(alias: string) {
  if (!config.remotes[alias]) {
    throw new Error("Could not find remote with alias " + alias);
  }

  delete config.remotes[alias];
  writeConfig();
}

export async function generateConfigContent(
  remoteAlias: string,
  projectAlias: string
) {
  const remote = safeGetRemote(remoteAlias);
  const result = await sendIPCCommand(
    {
      command: "get:project",
      key: remote.key,
      payload: {
        name: projectAlias,
      },
    },
    remote.host,
    remote.port
  );
  const data = result.payload;

  return `module.exports = {
  remoteAlias: "${remoteAlias}",
  projectAlias: "${projectAlias}",
  projectKey: "${data.key}",
  commands: [
    "yarn run build",
  ]
}`;
}

export async function createFileContent(
  remoteAlias: string,
  projectAlias: string
) {
  const content = await generateConfigContent(remoteAlias, projectAlias);
  const filePath = path.resolve(process.cwd(), "prup.config.js");
  fs.writeFileSync(filePath, content);
}

ensureDefaultConfig();
