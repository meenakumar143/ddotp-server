const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();

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
  expiry: Number,
  token: String
}));

// Home
app.get("/", (req, res) => {
  res.send("DDOTP Running");
});


// ================= LOGIN3 (NO CACHE FIX) =================
app.get("/login3", (req, res) => {
  res.set("Cache-Control", "no-store");

  res.send(`<!DOCTYPE html>
<html>
<head>
<title>DDOTP Login 3</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
input{display:block;margin:10px 0;padding:10px;width:300px}
button{padding:10px;cursor:pointer}
#msg{margin-top:10px;color:#ffd166;white-space:pre-wrap}
</style>
</head>
<body>

<h2>Login (No Cache)</h2>

<input id="u" placeholder="Username">
<input id="p" type="password" placeholder="Password">

<button id="btn">Login</button>

<div id="msg">Page Loaded</div>

<script>
document.getElementById("btn").addEventListener("click", async function () {

  const msg = document.getElementById("msg");
  const username = document.getElementById("u").value.trim();
  const password = document.getElementById("p").value;

  msg.innerText = "Button clicked";

  if (!username || !password) {
    msg.innerText = "Enter username/password";
    return;
  }

  try {
    msg.innerText = "Sending request...";

    const res = await fetch("/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    msg.innerText = "Response:\\n" + text;

    const d = JSON.parse(text);

    if (d.status === "success") {
      localStorage.setItem("token", d.token);
      localStorage.setItem("username", d.username);
      window.location = "/dashboard";
    } else if (d.status === "expired") {
      msg.innerText = "User expired";
    } else {
      msg.innerText = "Login failed";
    }

  } catch (e) {
    msg.innerText = "Fetch error: " + e.message;
  }

});
</script>

</body>
</html>`);
});


// ================= USER LOGIN API =================
app.post("/user/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) return res.json({ status: "error", message: "user_not_found" });
    if (user.password !== password) return res.json({ status: "error", message: "wrong_password" });
    if (Date.now() > user.expiry) return res.json({ status: "expired" });

    const token = crypto.randomBytes(16).toString("hex");
    user.token = token;
    await user.save();

    res.json({ status: "success", username, token });

  } catch (err) {
    console.log(err);
    res.json({ status: "error" });
  }
});


// ================= DASHBOARD =================
app.get("/dashboard", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>Dashboard</title>
<style>
body{background:#0d1117;color:#fff;font-family:sans-serif;padding:20px}
pre{background:#161b22;padding:15px;border-radius:10px}
button{padding:10px;margin:5px}
</style>
</head>
<body>

<h2>Secure Dashboard</h2>

<button onclick="logout()">Logout</button>

<pre id="data">Loading...</pre>

<script>
function logout(){
  localStorage.clear();
  location.href="/login3";
}

async function load(){
  const token = localStorage.getItem("token");

  if(!token){
    document.getElementById("data").innerText = "No token";
    return;
  }

  try{
    const res = await fetch("/secure-data", {
      headers: { token }
    });

    const d = await res.json();

    document.getElementById("data").innerText =
      JSON.stringify(d, null, 2);

  }catch(e){
    document.getElementById("data").innerText =
      "Error: " + e.message;
  }
}

load();
setInterval(load, 3000);
</script>

</body>
</html>`);
});


// ================= SECURE DATA =================
app.get("/secure-data", async (req, res) => {
  const token = req.headers.token;

  if (!token) return res.json({ status: "unauthorized" });

  const user = await User.findOne({ token });

  if (!user) return res.json({ status: "unauthorized" });
  if (Date.now() > user.expiry) return res.json({ status: "expired" });

  res.json({
    status: "success",
    stockyard: user.stockyard || "",
    vehicle: user.vehicle || "",
    delivery_code: user.delivery_code || ""
  });
});


// ================= ADMIN CREATE =================
app.post("/admin/create-user", async (req, res) => {
  const { username, password, days } = req.body;

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


// ================= NORMAL API =================
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


// ================= START =================
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
