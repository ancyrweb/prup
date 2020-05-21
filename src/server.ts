import express from "express";
import bodyParser from 'body-parser'
import {executeWithCommandsSafe, getProjects, isAppKeyValid} from "./core";

const app = express();
app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))

app
  .use((req, res, next) => {
    const key = req.header('x-pu-key');
    if (!isAppKeyValid(key)) {
      res
        .status(401)
        .send({
          message: "Invalid key",
        })
        .end();
      return;
    }

    next();
  })

app.post("/projects/build", async (req, res) => {
  if (!req.body.name || !req.body.key || !req.body.commands) {
    res
      .status(400)
      .send({
        message: "Invalid form",
      })
      .end();
  }

  await executeWithCommandsSafe(req.body.name, req.body.key, req.body.commands)
  res.send({ status: "done" });
  res.end();
})

app.post("/projects/get", async (req, res) => {
  if (!req.body.name) {
    res
      .status(400)
      .send({
        message: "Invalid form",
      })
      .end();
  }

  const projects = getProjects();

  const project = projects[req.body.name];
  if (!project) {
    res
      .status(404)
      .send()
      .end();
  }

  res.send(project);
  res.end();
})

app.listen(3000, () => {
  console.log("Pu is listening");
})
