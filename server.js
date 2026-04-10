const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// CORS
app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect("mongodb+srv://sandbookingord_db_user:Ddotp12345@ddotp-cluster.zqakueo.mongodb.net/ddotp?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// Schema
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  stockyard: String,
  vehicle: String,
  delivery_code: String,
  expiry: Number
}));

// Home
app.get("/", (req, res) => {
  res.send("DDOTP Running");
});

// 🔥 TEST PAGE (DEBUG)
app.get("/test", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Test</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
input,button{padding:10px;margin:5px}
pre{background:#222;padding:15px;border-radius:8px;white-space:pre-wrap}
</style>
</head>
<body>

<h2>DDOTP Test Page</h2>

<input id="username" placeholder="Enter username">
<button onclick="loadData()">Load Data</button>

<pre id="output">Waiting...</pre>

<script>
function loadData() {
  const u = document.getElementById("username").value.trim();
  const out = document.getElementById("output");

  out.textContent = "Button Clicked";

  if (!u) {
    alert("enter username");
    return;
  }

  out.textContent = "Loading for: " + u;

  fetch("/api/user/stockyard/" + encodeURIComponent(u))
    .then(res => res.text())
    .then(txt => {
      out.textContent = txt;
    })
    .catch(err => {
      out.textContent = "Error: " + err.message;
    });
}
</script>

</body>
</html>
`);
});

// CREATE USER
app.post("/admin/create-user", async (req, res) => {
  const { username, password, days } = req.body;

  if (!username || !password) {
    return res.json({ status: "missing" });
  }

  const exist = await User.findOne({ username });
  if (exist) return res.json({ status: "exists" });

  const expiry = Date.now() + (days * 86400000);

  await User.create({
    username,
    password,
    stockyard: "",
    vehicle: "",
    delivery_code: "",
    expiry
  });

  res.json({ status: "created" });
});

// USERS
app.get("/admin/users", async (req, res) => {
  const users = await User.find();
  let out = {};
  users.forEach(u => out[u.username] = u);
  res.json(out);
});

// UPDATE
app.post("/admin/update-user", async (req, res) => {
  const { username, vehicle, stockyard, delivery_code } = req.body;

  await User.updateOne(
    { username },
    { vehicle, stockyard, delivery_code }
  );

  res.json({ status: "updated" });
});

// DELETE
app.post("/admin/delete-user", async (req, res) => {
  await User.deleteOne({ username: req.body.username });
  res.json({ status: "deleted" });
});

// EXTEND
app.post("/admin/extend-user", async (req, res) => {
  const { username, days } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.json({ status: "not_found" });

  user.expiry += days * 86400000;
  await user.save();

  res.json({ status: "extended" });
});

// API
app.get("/api/user/stockyard/:username", async (req, res) => {
  const user = await User.findOne({ username: req.params.username });

  if (!user) return res.json({ status: "error" });
  if (Date.now() > user.expiry) return res.json({ status: "expired" });

  res.json({
    status: "success",
    stockyard: user.stockyard || "",
    vehicle: user.vehicle || "",
    delivery_code: user.delivery_code || ""
  });
});

// START
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
