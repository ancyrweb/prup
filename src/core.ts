import * as crypto from "crypto";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as child from "child_process";
import axios from "axios";

type Project = {
  key: string
  path: string
}

type Remote = {
  key: string
  url: string
}

type Config = {
  key: string
  projects: Record<string, Project>
  remotes: Record<string, Remote>
}

let defaultConfig : Config = {
  key: null,
  projects: {},
  remotes: {},
};

let config : Config = defaultConfig;

const homeFolder = os.homedir();
const appFolder = path.resolve(homeFolder, ".pu");
const configFile = path.resolve(appFolder, "config.json");

if (!fs.existsSync(appFolder)) {
  fs.mkdirSync(appFolder);
}

function safeGetRemote(alias: string) : Remote {
  const remote = getRemotes()[alias];
  if (!remote) {
    throw new Error("Unrecognized remmote " + alias);
  }
  return remote;
}
function remoteURL(remote: Remote) : string {
  return remote.url.endsWith("/") ? remote.url.slice(0, remote.url.length - 1) : remote.url;
}

export function isAppKeyValid(key: string) {
  return key === config.key;
}

export function writeConfig() {
  fs.writeFileSync(configFile, JSON.stringify(config))
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
    }
  }
}

export function execute(workingDirectory: string, commands: string[]) {
  console.log("In " + workingDirectory);
  for (let command of commands) {
    console.log("Executing `" + command + "`")
    const result = child.execSync(command, {
      cwd: workingDirectory
    });
    console.log("Done executing `" + command + "`")
  }

  console.log("Pu is done building.");
}

export function executeForDirectory(workingDir: string) {
  const file = path.resolve(workingDir, "pu.config.js");
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

export function executeWithCommandsSafe(name: string, key: string, commands: string[]) {
  if (!config.projects[name]) {
    throw new Error("Project with name " + name + " isn't registered.");
  }

  if (config.projects[name].key !== key) {
    throw new Error("Invalid key");
  }

  return execute(config.projects[name].path, commands);
}

export async function executeRemote(configPath: string) {
  const finalPath = path.resolve(configPath, "pu.config.js");
  if (!fs.existsSync(finalPath)) {
    throw new Error("Could not find pu.config.js inside " + configPath);
  }

  const data = require(finalPath);
  const remote = safeGetRemote(data.remoteAlias);

  const url = remoteURL(remote);
  const result = await axios.post<Project>(url + "/projects/build", {
    name: data.projectAlias,
    key: data.projectKey,
    commands: data.commands,
  }, {
    headers: {
      "x-pu-key": remote.key
    }
  });
}
export function addProject(name: string, directory: string) {
  if (config.projects[name] && config.projects) {
    console.warn("Project " + name + " is already defined with path " + directory + " and will be erased.");
  }

  config.projects[name] = {
    key: crypto.randomBytes(48).toString("hex"),
    path: directory
  };
  writeConfig();
}

export function getProjects() {
  return config.projects;
}

export function getRemotes() {
  return config.remotes;
}

export function addRemote(alias: string, url: string, key: string) {
  const remote : Remote = {
    url,
    key
  }

  if (config.remotes[alias]) {
    console.warn("Remote " + name + " is already defined with path and will be erased.");
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

export async function generateConfigContent(remoteAlias: string, projectAlias: string) {
  const remote = safeGetRemote(remoteAlias);
  const url = remoteURL(remote);
  const result = await axios.post<Project>(url + "/projects/get", {
    name: projectAlias
  }, {
    headers: {
      "x-pu-key": remote.key
    }
  });

  const data = result.data;

  return `module.exports = {
  remoteAlias: "${remoteAlias}",
  projectAlias: "${projectAlias}",
  projectKey: "${data.key}",
  commands: [
    "yarn run build",
  ]
}
  `;
}

export async function createFileContent(remoteAlias: string, projectAlias: string) {
  const content = await generateConfigContent(remoteAlias, projectAlias);
  const filePath = path.resolve(process.cwd(), "pu.config.js");
  fs.writeFileSync(filePath, content);
}

ensureDefaultConfig();
