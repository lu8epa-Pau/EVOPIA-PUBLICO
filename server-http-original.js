const express = require("express");
const http = require("http");
const WS = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WS.Server({ server });
const U = new Map();

let n = 1;

app.use(express.static("public"));

const send = (w, m) => {
  if (w.readyState === 1) w.send(JSON.stringify(m));
};

const roster = () =>
  [...U].map(([id, u]) => ({
    id,
    name: u.name,
    role: u.role
  }));

const all = (m, x) =>
  U.forEach(u => {
    if (u.ws !== x) send(u.ws, m);
  });

wss.on("connection", ws => {
  let id = "u" + n++;

  U.set(id, {
    ws,
    name: "Operador",
    role: "operator"
  });

  send(ws, {
    type: "welcome",
    id
  });

  all({
    type: "roster",
    users: roster()
  });

  ws.on("message", b => {
    let m;

    try {
      m = JSON.parse(b);
    } catch {
      return;
    }

    let u = U.get(id);
    if (!u) return;

    if (m.type === "join") {
      u.name = String(m.name || "Operador").slice(0, 50);
      u.role = m.role === "instructor" ? "instructor" : "operator";

      for (let [oid] of U) {
        if (oid !== id) {
          send(ws, {
            type: "peer",
            id: oid
          });
        }
      }

      all({
        type: "peer-new",
        id
      }, ws);

      all({
        type: "roster",
        users: roster()
      });
    }

    else if (["offer", "answer", "ice"].includes(m.type)) {
      let t = U.get(String(m.to));

      if (t) {
        send(t.ws, {
          ...m,
          from: id
        });
      }
    }

    else if (m.type === "ptt") {
      all({
        type: "ptt",
        name: u.name,
        active: !!m.active
      }, ws);
    }

    else if (m.type === "event") {
      all({
        type: "event",
        name: u.name,
        text: String(m.text || "")
      }, ws);
    }
  });

  ws.on("close", () => {
    U.delete(id);

    all({
      type: "peer-left",
      id
    });

    all({
      type: "roster",
      users: roster()
    });
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("EVOPIA listo");
});