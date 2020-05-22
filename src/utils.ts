import chalk from "chalk";
import ip from "ip";
import * as os from "os";

export const logError = (text: string) => console.error(chalk.red(text));
export const logSuccess = (text: string) => console.log(chalk.green(text));
export const getIPAddress = () => ip.address();
export const getHostName = () => os.hostname();
