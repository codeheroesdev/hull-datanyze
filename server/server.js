import express from "express";
import path from "path";
import { renderFile } from "ejs";
import UpdateUser from "./update-user";
import handleAdmin from "./admin";

module.exports = function Server(options = {}) {
  const { port, Hull, hostSecret, cache, queue } = options;
  const { BatchHandler, NotifHandler, Routes } = Hull;
  const { Readme, Manifest } = Routes;
  const app = express();

  const updateUser = UpdateUser(options);

  app.set("views", `${__dirname}/../views`);
  app.set("view engine", "ejs");
  app.engine("html", renderFile);
  app.use(express.static(path.resolve(__dirname, "..", "dist")));
  app.use(express.static(path.resolve(__dirname, "..", "assets")));

  app.get("/manifest.json", Manifest(__dirname));
  app.get("/", Readme);
  app.get("/readme", Readme);

  app.post("/batch", BatchHandler({
    hostSecret,
    batchSize: 100,
    groupTraits: false,
    handler: (notifications = [], { hull, ship }) => {
      hull.logger.debug("datanyze.batch.process", { notifications: notifications.length });
      notifications.map(({ message }) => updateUser({ message }, { hull, ship }));
    }
  }));
  app.get("/admin", Hull.Middleware({ hostSecret, fetchShip: true, cacheShip: true }), handleAdmin);
  app.post("/notify", NotifHandler({
    hostSecret,
    groupTraits: false,
    onSubscribe() {
      console.warn("Hello new subscriber !");
    },
    handlers: {
      "user:update": updateUser
    }
  }));

  Hull.logger.info("datanyze.started", { port });
  app.listen(port);

  return app;
};
