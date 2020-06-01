import chalk from "chalk";
import {getHostName, getIPAddress} from "./utils";
import {getDefaultIPCServerPort} from "./ipc-server";
import {getAppKey} from "./core";

export function printHowToAddProject(name: string) {
  console.log(chalk.bold(chalk.greenBright("1 Start the server")));
  console.log("Ensure the server is running for your machine to communicate with it. Type : ");
  console.log("");
  console.log(chalk.bold("prup server start"));
  console.log("");
  console.log(chalk.bold(chalk.greenBright("2. Add the remote")));
  console.log("Then, add this machine as a remote in your local machine.")
  console.log("Type the following command :")
  console.log("");
  console.log(chalk.bold("prup remotes add " + getHostName() + " " + getIPAddress() + " " + getDefaultIPCServerPort() + " " + getAppKey()));
  console.log("");
  console.log(chalk.bold(chalk.greenBright("3. Link the project")));
  console.log("Now, move into your code's folder and type :")
  console.log("");
  console.log(chalk.bold("prup projects create-config " + getHostName() + " " + name + ""))
  console.log("");
  console.log(chalk.bold(chalk.greenBright("4. Build !")));
  console.log("Open the " + chalk.bold("prup.config.js") + " file. You will see a " + chalk.bold("commands") + " entry.");
  console.log("Put in here the commands you want to run on your server in order to build the project.");
  console.log("When you are done, simply type : ");
  console.log("");
  console.log(chalk.bold("prup"));
  console.log("");
  console.log(chalk.green("Hooray, you are done !"));
}
