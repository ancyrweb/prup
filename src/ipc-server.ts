import net from "net";
import {executeWithCommandsSafe, getAppKey, getProjects, loadConfig} from "./core";

const PORT = 17997;

export function getDefaultIPCServerPort() {
  return PORT;
}
function serialize(data: any): string {
  return JSON.stringify(data);
}

function deserialize(data: string) {
  return JSON.parse(data);
}

export async function startIPCServer() {
  const server = net.createServer(function (socket) {
    function writeBack(result: object) {
      socket.write(serialize(result));
    }
    function writeInvalidCommand() {
      writeBack({
        result: "Invalid command",
      });
    }

    function writeUnknownCommand() {
      writeBack({
        result: "command unknown",
      });
    }

    socket.on("data", async function (data) {
      const request = deserialize(data.toString());
      if (!request.command || !request.key || request.key !== getAppKey()) {
        writeUnknownCommand();
        return;
      }

      // Synchronize with local file
      loadConfig();

      switch (request.command) {
        case "healthcheck":
          writeBack({
            result: "healthy",
          });
          break;
        case "stop":
          writeBack({
            result: "ok",
          });
          console.log("Received command to stop.");
          socket.end();
          server.close();
          break;
        case "build":
          if (
            !request.payload?.name ||
            !request.payload?.key ||
            !request.payload?.commands
          ) {
            writeInvalidCommand();
            break;
          }
          await executeWithCommandsSafe(
            request.payload.name,
            request.payload.key,
            request.payload.commands
          );
          writeBack({
            result: "done",
          });
          break;
        case "get:project":
          if (!request.payload?.name) {
            writeInvalidCommand();
            break;
          }

          const projects = getProjects();
          const project = projects[request.payload.name];
          if (!project) {
            writeInvalidCommand();
            break;
          }

          writeBack({
            result: "done",
            payload: project,
          });
          break;
        default:
          writeUnknownCommand();
          break;
      }
    });
  });

  server.listen(PORT, () => {
    console.log("Listening on port " + PORT);
  });
}

export type CommandType =
  | {
      key: string;
      command?: "healthcheck";
    }
  | {
      key: string;
      command?: "stop";
    }
  | {
      key: string;
      command?: "build";
      payload?: {
        name?: string;
        key?: string;
        commands?: string[];
      };
    }
  | {
      key: string;
      command?: "get:project";
      payload?: {
        name?: string;
      };
    };

export function sendIPCCommand(
  command: CommandType,
  host = "127.0.0.1",
  port = PORT
): Promise<any> {
  return new Promise((accept, reject) => {
    const client = net.connect({ port, host }, function () {
      client.write(
        serialize({
          ...command,
        })
      );
      client.on("data", function (data) {
        client.end();
        accept(deserialize(data.toString()));
      });
    });
    client.on("error", reject);
  });
}
