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

// User login page
app.get("/login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Login</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
input{display:block;margin:10px 0;padding:10px;width:300px}
button{padding:10px;margin-top:10px;cursor:pointer}
#msg{margin-top:10px;color:#ffd166}
</style>
</head>
<body>

<h2>User Login</h2>

<input id="u" placeholder="Username">
<input id="p" type="password" placeholder="Password">
<button onclick="loginUser()">Login</button>

<div id="msg"></div>

<script>
async function loginUser(){
  document.getElementById("msg").innerText = "Logging in...";

  try{
    const res = await fetch("/user/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        username:document.getElementById("u").value,
        password:document.getElementById("p").value
      })
    });

    const d = await res.json();

    if(d.status==="success"){
      localStorage.setItem("token", d.token);
      localStorage.setItem("username", d.username);
      window.location="/dashboard";
    }else if(d.status==="expired"){
      document.getElementById("msg").innerText="User expired";
    }else{
      document.getElementById("msg").innerText="Login failed";
    }
  }catch(e){
    document.getElementById("msg").innerText="Login error: " + e.message;
  }
}
</script>

</body>
</html>
`);
});

// User login API
app.post("/user/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) return res.json({ status: "error" });
    if (user.password !== password) return res.json({ status: "error" });
    if (Date.now() > user.expiry) return res.json({ status: "expired" });

    const token = crypto.randomBytes(16).toString("hex");
    user.token = token;
    await user.save();

    res.json({ status: "success", token, username });
  } catch (err) {
    console.log("USER LOGIN ERROR:", err);
    res.json({ status: "error" });
  }
});

// Secure dashboard
app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Secure Dashboard</title>
<style>
body{background:#0d1117;color:#fff;font-family:sans-serif;padding:20px}
pre{background:#161b22;padding:15px;border-radius:10px;white-space:pre-wrap}
button{padding:10px;margin:5px;cursor:pointer}
</style>
</head>
<body>

<h2>DDOTP Secure Dashboard</h2>

<div>User: <span id="userLabel"></span></div>
<button onclick="logoutUser()">Logout</button>

<pre id="data">Loading...</pre>

<script>
document.getElementById("userLabel").innerText = localStorage.getItem("username") || "-";

function logoutUser(){
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location="/login";
}

async function load(){
  const token = localStorage.getItem("token");
  const box = document.getElementById("data");

  if(!token){
    box.innerText = "No token found. Please login again.";
    return;
  }

  try{
    const res = await fetch("/secure-data",{
      headers:{ "token": token }
    });

    const text = await res.text();

    try{
      const d = JSON.parse(text);
      box.innerText = JSON.stringify(d, null, 2);

      if(d.status === "unauthorized"){
        box.innerText = "Unauthorized. Please login again.";
      }
      if(d.status === "expired"){
        box.innerText = "User expired.";
      }
    }catch(e){
      box.innerText = "Non-JSON response:\\n\\n" + text;
    }
  }catch(e){
    box.innerText = "Fetch error: " + e.message;
  }
}

load();
setInterval(load, 3000);
</script>

</body>
</html>
`);
});

// Secure API
app.get("/secure-data", async (req, res) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.json({ status: "unauthorized" });
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.json({ status: "unauthorized" });
    }

    if (Date.now() > user.expiry) {
      return res.json({ status: "expired" });
    }

    res.json({
      status: "success",
      username: user.username,
      stockyard: user.stockyard || "",
      vehicle: user.vehicle || "",
      delivery_code: user.delivery_code || ""
    });
  } catch (err) {
    console.log("SECURE DATA ERROR:", err);
    res.json({ status: "error" });
  }
});

// Admin create user
app.post("/admin/create-user", async (req, res) => {
  try {
    const { username, password, days } = req.body;

    if (!username || !password) {
      return res.json({ status: "missing" });
    }

    const exist = await User.findOne({ username });
    if (exist) {
      return res.json({ status: "exists" });
    }

    const expiry = Date.now() + (parseInt(days || 1, 10) * 86400000);

    await User.create({
      username,
      password,
      stockyard: "",
      vehicle: "",
      delivery_code: "",
      expiry,
      token: ""
    });

    res.json({ status: "created" });
  } catch (err) {
    console.log("CREATE USER ERROR:", err);
    res.json({ status: "error", message: err.message });
  }
});

// Admin users
app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find().lean();
    const out = {};
    users.forEach(u => {
      out[u.username] = u;
    });
    res.json(out);
  } catch (err) {
    console.log("GET USERS ERROR:", err);
    res.json({});
  }
});

// Admin update user
app.post("/admin/update-user", async (req, res) => {
  try {
    const { username, vehicle, stockyard, delivery_code } = req.body;

    await User.updateOne(
      { username },
      { vehicle, stockyard, delivery_code }
    );

    res.json({ status: "updated" });
  } catch (err) {
    console.log("UPDATE USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// Admin delete user
app.post("/admin/delete-user", async (req, res) => {
  try {
    await User.deleteOne({ username: req.body.username });
    res.json({ status: "deleted" });
  } catch (err) {
    console.log("DELETE USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// Admin extend user
app.post("/admin/extend-user", async (req, res) => {
  try {
    const { username, days } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.json({ status: "not_found" });

    user.expiry = (user.expiry || Date.now()) + (parseInt(days || 1, 10) * 86400000);
    await user.save();

    res.json({ status: "extended", expiry: user.expiry });
  } catch (err) {
    console.log("EXTEND USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// Plain API
app.get("/api/user/stockyard/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) return res.json({ status: "error" });
    if (Date.now() > user.expiry) return res.json({ status: "expired" });

    res.json({
      status: "success",
      stockyard: user.stockyard || "",
      vehicle: user.vehicle || "",
      delivery_code: user.delivery_code || ""
    });
  } catch (err) {
    console.log("API USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// Start
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
