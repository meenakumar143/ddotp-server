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

// LOGIN PAGE
app.get("/login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Login</title>
</head>
<body style="background:#111;color:#fff;font-family:sans-serif">

<h2>User Login</h2>

<input id="u" placeholder="Username"><br><br>
<input id="p" type="password" placeholder="Password"><br><br>

<button onclick="login()">Login</button>

<script>
function login(){
fetch("/user/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:u.value,
password:p.value
})
})
.then(r=>r.json())
.then(d=>{
if(d.status==="success"){
localStorage.setItem("token", d.token);
window.location="/dashboard";
}else{
alert("Login Failed");
}
});
}
</script>

</body>
</html>
`);
});

// LOGIN API
app.post("/user/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user) return res.json({ status: "error" });
  if (user.password !== password) return res.json({ status: "error" });
  if (Date.now() > user.expiry) return res.json({ status: "expired" });

  // 🔥 Generate token
  const token = crypto.randomBytes(16).toString("hex");
  user.token = token;
  await user.save();

  res.json({ status: "success", token });
});

// DASHBOARD
app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<body style="background:#0d1117;color:#fff">

<h2>DDOTP Secure Dashboard</h2>

<div id="data">Loading...</div>

<script>
async function load(){
const token = localStorage.getItem("token");

const res = await fetch("/secure-data",{
headers:{ "token": token }
});

const d = await res.json();

document.getElementById("data").innerText = JSON.stringify(d, null, 2);
}

load();
setInterval(load,3000);
</script>

</body>
</html>
`);
});

// 🔐 SECURE API
app.get("/secure-data", async (req, res) => {
  const token = req.headers.token;

  const user = await User.findOne({ token });

  if (!user) return res.json({ status: "unauthorized" });

  res.json({
    status: "success",
    stockyard: user.stockyard,
    vehicle: user.vehicle,
    delivery_code: user.delivery_code
  });
});

// ADMIN (same as before basic)
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

// START
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
