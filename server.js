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

// NEW LOGIN PAGE (DEBUG)
app.get("/login2", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Login 2</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
input{display:block;margin:10px 0;padding:10px;width:300px}
button{padding:10px;margin-top:10px;cursor:pointer}
#msg{margin-top:10px;color:#ffd166;white-space:pre-wrap}
</style>
</head>
<body>

<h2>User Login Debug</h2>

<input id="u" placeholder="Username">
<input id="p" type="password" placeholder="Password">
<button id="loginBtn">Login</button>

<div id="msg">Waiting...</div>

<script>
document.getElementById("loginBtn").addEventListener("click", async function () {
  const msg = document.getElementById("msg");
  const username = document.getElementById("u").value.trim();
  const password = document.getElementById("p").value;

  msg.innerText = "Button clicked";

  if (!username || !password) {
    msg.innerText = "Username/password enter chey";
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
    msg.innerText = "Response raw:\\n" + text;

    let d;
    try {
      d = JSON.parse(text);
    } catch (e) {
      msg.innerText = "JSON parse error\\n\\n" + text;
      return;
    }

    if (d.status === "success") {
      localStorage.setItem("token", d.token);
      localStorage.setItem("username", d.username);
      msg.innerText = "Login success. Redirecting...";
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
</html>
`);
});

// OLD LOGIN PAGE ALSO KEEP
app.get("/login", (req, res) => {
  res.redirect("/login2");
});

// USER LOGIN API
app.post("/user/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.json({ status: "error", message: "user_not_found" });
    }

    if (user.password !== password) {
      return res.json({ status: "error", message: "wrong_password" });
    }

    if (Date.now() > user.expiry) {
      return res.json({ status: "expired" });
    }

    const token = crypto.randomBytes(16).toString("hex");
    user.token = token;
    await user.save();

    res.json({
      status: "success",
      username: user.username,
      token
    });
  } catch (err) {
    console.log("USER LOGIN ERROR:", err);
    res.json({ status: "error", message: err.message });
  }
});

// DASHBOARD
app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Dashboard</title>
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
  window.location="/login2";
}

async function load(){
  const token = localStorage.getItem("token");
  const box = document.getElementById("data");

  if(!token){
    box.innerText = "No token found. Please login again.";
    return;
  }

  try{
    const res = await fetch("/secure-data", {
      headers: { "token": token }
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

// SECURE DATA API
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
    res.json({ status: "error", message: err.message });
  }
});

// AUTOFILL PAGE
app.get("/autofill3", async (req, res) => {
  const username = String(req.query.username || "").trim();

  let stockyard = "";
  let vehicle = "";
  let delivery_code = "";
  let message = "Waiting...";

  if (username) {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        message = "User not found";
      } else if (Date.now() > user.expiry) {
        message = "User expired";
      } else {
        stockyard = user.stockyard || "";
        vehicle = user.vehicle || "";
        delivery_code = user.delivery_code || "";
        message = "Auto Loaded ✅";
      }
    } catch (e) {
      message = "Error: " + e.message;
    }
  } else {
    message = "No username";
  }

  const safeUsername = username.replace(/"/g, "&quot;");

  res.send(`<!DOCTYPE html>
<html>
<head>
<title>DDOTP AUTO LIVE</title>
<style>
body{background:#0d1117;color:#fff;font-family:sans-serif;padding:20px}
input{display:block;margin:10px 0;padding:10px;width:320px;font-size:16px}
button{padding:10px;margin:5px;cursor:pointer}
.copy{background:#00b894;color:#fff;border:none}
.status{margin:10px 0;color:#ffd166;font-weight:bold}
.box{background:#161b22;padding:15px;border-radius:10px;width:350px}
</style>
</head>
<body>

<h2>DDOTP LIVE ⚡</h2>

<div class="status" id="status">${message}</div>

<div class="box">
<label>Stockyard</label>
<input id="stockyard" value="${stockyard}">
<button class="copy" onclick="copyText('stockyard')">Copy</button>

<label>Vehicle</label>
<input id="vehicle" value="${vehicle}">
<button class="copy" onclick="copyText('vehicle')">Copy</button>

<label>Delivery Code</label>
<input id="delivery_code" value="${delivery_code}">
<button class="copy" onclick="copyText('delivery_code')">Copy</button>
</div>

<script>
function copyText(id){
  const val = document.getElementById(id).value;
  navigator.clipboard.writeText(val);
  alert(id + " copied: " + val);
}

async function refreshData(){
  try{
    const res = await fetch("/api/user/stockyard/${safeUsername}");
    const data = await res.json();

    if(data.status === "success"){
      document.getElementById("stockyard").value = data.stockyard || "";
      document.getElementById("vehicle").value = data.vehicle || "";
      document.getElementById("delivery_code").value = data.delivery_code || "";
      document.getElementById("status").innerText = "Live Updated 🔄";
    }else{
      document.getElementById("status").innerText = data.status;
    }
  }catch(e){
    document.getElementById("status").innerText = "Error";
  }
}
setInterval(refreshData, 3000);
</script>

</body>
</html>`);
});

// TEST PAGE
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
<button id="loadBtn">Load Data</button>

<pre id="output">Waiting...</pre>

<script>
document.getElementById("loadBtn").addEventListener("click", async function () {
  const u = document.getElementById("username").value.trim();
  const out = document.getElementById("output");

  if(!u){
    alert("enter username");
    return;
  }

  out.textContent = "Loading...";

  try {
    const res = await fetch("/api/user/stockyard/" + encodeURIComponent(u));
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    out.textContent = "Error: " + e.message;
  }
});
</script>

</body>
</html>
`);
});

// ADMIN LOGIN
app.post("/admin/login", (req, res) => {
  if (req.body.username === "admin" && req.body.password === "1234") {
    return res.json({ status: "success" });
  }
  res.json({ status: "invalid" });
});

// ADMIN PAGE
app.get("/admin", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Admin</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif}
input,select{padding:8px;margin:5px}
button{padding:8px;margin:5px;cursor:pointer}
table{width:100%;margin-top:20px;border-collapse:collapse}
td,th{border:1px solid #555;padding:8px;text-align:center}
</style>
</head>
<body>

<div id="loginBox">
<h2>Admin Login</h2>
<input id="adminUser" placeholder="Username">
<input id="adminPass" type="password" placeholder="Password">
<button onclick="adminLogin()">Login</button>
<div id="msg"></div>
</div>

<div id="panelBox" style="display:none">
<h2>Admin Panel</h2>

<input id="username" placeholder="Username">
<input id="password" placeholder="Password">
<select id="days">
<option value="1">1 Day</option>
<option value="3">3 Days</option>
<option value="7">7 Days</option>
</select>
<button onclick="createUser()">Create</button>

<button onclick="loadUsers()">Refresh</button>

<table>
<thead>
<tr>
<th>User</th><th>Password</th><th>Vehicle</th><th>Stockyard</th><th>Delivery</th><th>Expiry</th><th>Actions</th>
</tr>
</thead>
<tbody id="table"></tbody>
</table>
</div>

<script>
function adminLogin(){
fetch("/admin/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:document.getElementById("adminUser").value,
password:document.getElementById("adminPass").value
})
})
.then(r=>r.json())
.then(d=>{
if(d.status==="success"){
document.getElementById("loginBox").style.display="none";
document.getElementById("panelBox").style.display="block";
loadUsers();
}else{
document.getElementById("msg").innerText="Invalid";
}
});
}

function createUser(){
fetch("/admin/create-user",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:document.getElementById("username").value,
password:document.getElementById("password").value,
days:document.getElementById("days").value
})
})
.then(r=>r.json())
.then(d=>{
alert(JSON.stringify(d));
loadUsers();
});
}

function loadUsers(){
fetch("/admin/users")
.then(r=>r.json())
.then(data=>{
let html="";
for(let u in data){
let e = data[u].expiry ? new Date(data[u].expiry).toLocaleString() : "";
html += \`
<tr>
<td>\${u}</td>
<td><input value="\${data[u].password || ""}" id="p_\${u}"></td>
<td><input value="\${data[u].vehicle || ""}" id="v_\${u}"></td>
<td><input value="\${data[u].stockyard || ""}" id="s_\${u}"></td>
<td><input value="\${data[u].delivery_code || ""}" id="d_\${u}"></td>
<td>\${e}</td>
<td>
<button onclick="updateUser('\${u}')">Update</button>
<button onclick="deleteUser('\${u}')">Delete</button>
<button onclick="extendUser('\${u}',1)">+1</button>
<button onclick="extendUser('\${u}',7)">+7</button>
</td>
</tr>\`;
}
document.getElementById("table").innerHTML = html;
});
}

function updateUser(u){
fetch("/admin/update-user",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:u,
vehicle:document.getElementById("v_"+u).value,
stockyard:document.getElementById("s_"+u).value,
delivery_code:document.getElementById("d_"+u).value
})
})
.then(r=>r.json())
.then(()=>loadUsers());
}

function deleteUser(u){
fetch("/admin/delete-user",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:u})
})
.then(r=>r.json())
.then(()=>loadUsers());
}

function extendUser(u,d){
fetch("/admin/extend-user",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:u,days:d})
})
.then(r=>r.json())
.then(()=>loadUsers());
}
</script>

</body>
</html>
`);
});

// CREATE USER
app.post("/admin/create-user", async (req, res) => {
  try {
    const { username, password, days } = req.body;

    if (!username || !password) {
      return res.json({ status: "missing" });
    }

    const exist = await User.findOne({ username });
    if (exist) return res.json({ status: "exists" });

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

// USERS
app.get("/admin/users", async (req, res) => {
  try {
    const users = await User.find().lean();
    let out = {};
    users.forEach(u => {
      out[u.username] = u;
    });
    res.json(out);
  } catch (err) {
    console.log("GET USERS ERROR:", err);
    res.json({});
  }
});

// UPDATE
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

// DELETE
app.post("/admin/delete-user", async (req, res) => {
  try {
    await User.deleteOne({ username: req.body.username });
    res.json({ status: "deleted" });
  } catch (err) {
    console.log("DELETE USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// EXTEND
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

// PLAIN API
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

// START
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
