const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  token: String,
  token_created_at: Number
}));

// Home
app.get("/", (req, res) => {
  res.send("DDOTP Running with Token System");
});

// ================= USER LOGIN PAGE =================
app.get("/login", (req, res) => {
  const msg = String(req.query.msg || "");

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>DDOTP Login</title>
  <style>
    body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
    input{display:block;margin:10px 0;padding:10px;width:300px}
    button{padding:10px;cursor:pointer}
    .msg{margin-top:10px;color:#ffd166}
  </style>
</head>
<body>

<h2>User Login</h2>

<form method="POST" action="/user/login-form">
  <input name="username" placeholder="Username" required>
  <input name="password" type="password" placeholder="Password" required>
  <button type="submit">Login</button>
</form>

<div class="msg">${msg}</div>

</body>
</html>`);
});

// ================= USER LOGIN FORM =================
app.post("/user/login-form", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const user = await User.findOne({ username });

    if (!user) {
      return res.redirect("/login?msg=User%20not%20found");
    }

    if (user.password !== password) {
      return res.redirect("/login?msg=Wrong%20password");
    }

    if (Date.now() > user.expiry) {
      return res.redirect("/login?msg=User%20expired");
    }

    // 🔥 Token generate
    const token = crypto.randomBytes(24).toString("hex");
    user.token = token;
    user.token_created_at = Date.now();
    await user.save();

    return res.redirect("/dashboard?token=" + encodeURIComponent(token));
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res.redirect("/login?msg=Login%20error");
  }
});

// ================= DASHBOARD =================
app.get("/dashboard", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();

    if (!token) {
      return res.redirect("/login?msg=No%20token");
    }

    const user = await User.findOne({ token });

    if (!user) {
      return res.redirect("/login?msg=Invalid%20token");
    }

    if (Date.now() > user.expiry) {
      return res.redirect("/login?msg=User%20expired");
    }

    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>DDOTP Dashboard</title>
  <style>
    body{background:#0d1117;color:#fff;font-family:sans-serif;padding:20px}
    input{display:block;margin:10px 0;padding:10px;width:320px}
    button{padding:10px;margin:5px;cursor:pointer}
    .box{background:#161b22;padding:15px;border-radius:10px;width:380px}
    .line{margin:8px 0;color:#ffd166}
  </style>
</head>
<body>

<h2>DDOTP Secure Dashboard</h2>

<div class="line">User: ${user.username}</div>
<div class="line">Token Enabled ✅</div>

<div class="box">
  <label>Stockyard</label>
  <input id="stockyard" value="${(user.stockyard || "").replace(/"/g, "&quot;")}" readonly>

  <label>Vehicle</label>
  <input id="vehicle" value="${(user.vehicle || "").replace(/"/g, "&quot;")}" readonly>

  <label>Delivery Code</label>
  <input id="delivery_code" value="${(user.delivery_code || "").replace(/"/g, "&quot;")}" readonly>
</div>

<br>
<a href="/secure-data?token=${encodeURIComponent(token)}" style="color:#58a6ff">Open Secure Data</a>
<a href="/logout?token=${encodeURIComponent(token)}" style="color:#58a6ff;margin-left:15px">Logout</a>

</body>
</html>`);
  } catch (err) {
    console.log("DASHBOARD ERROR:", err);
    return res.redirect("/login?msg=Dashboard%20error");
  }
});

// ================= SECURE DATA =================
app.get("/secure-data", async (req, res) => {
  try {
    const token = String(req.query.token || req.headers.token || "").trim();

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

// ================= LOGOUT =================
app.get("/logout", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();

    if (token) {
      const user = await User.findOne({ token });
      if (user) {
        user.token = "";
        user.token_created_at = 0;
        await user.save();
      }
    }

    res.redirect("/login?msg=Logged%20out");
  } catch (err) {
    console.log("LOGOUT ERROR:", err);
    res.redirect("/login?msg=Logout%20error");
  }
});

// ================= AUTOFILL3 =================
app.get("/autofill3", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim();

    let stockyard = "";
    let vehicle = "";
    let delivery_code = "";
    let message = "No username";

    if (username) {
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
    }

    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>DDOTP AutoFill</title>
  <style>
    body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
    input{display:block;margin:10px 0;padding:10px;width:320px}
    .msg{margin:15px 0;color:#ffd166;font-weight:bold}
  </style>
</head>
<body>

<h2>DDOTP AutoFill</h2>
<div class="msg">${message}</div>

<form method="GET" action="/autofill3">
  <input name="username" value="${username.replace(/"/g, "&quot;")}" placeholder="Enter username">
  <button type="submit">Load</button>
</form>

<label>Stockyard</label>
<input value="${stockyard.replace(/"/g, "&quot;")}" readonly>

<label>Vehicle</label>
<input value="${vehicle.replace(/"/g, "&quot;")}" readonly>

<label>Delivery Code</label>
<input value="${delivery_code.replace(/"/g, "&quot;")}" readonly>

</body>
</html>`);
  } catch (err) {
    console.log("AUTOFILL ERROR:", err);
    res.send("Autofill error");
  }
});

// ================= ADMIN LOGIN API =================
app.post("/admin/login", (req, res) => {
  if (req.body.username === "admin" && req.body.password === "1234") {
    return res.json({ status: "success" });
  }
  res.json({ status: "invalid" });
});

// ================= ADMIN PAGE =================
app.get("/admin", (req, res) => {
  res.send(`<!DOCTYPE html>
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
<th>User</th><th>Password</th><th>Vehicle</th><th>Stockyard</th><th>Delivery</th><th>Expiry</th><th>Token</th><th>Actions</th>
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
let t = data[u].token || "";
html += \`
<tr>
<td>\${u}</td>
<td><input value="\${data[u].password || ""}" id="p_\${u}"></td>
<td><input value="\${data[u].vehicle || ""}" id="v_\${u}"></td>
<td><input value="\${data[u].stockyard || ""}" id="s_\${u}"></td>
<td><input value="\${data[u].delivery_code || ""}" id="d_\${u}"></td>
<td>\${e}</td>
<td style="max-width:180px;word-break:break-all;">\${t}</td>
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
</html>`);
});

// ================= CREATE USER =================
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
      token: "",
      token_created_at: 0
    });

    res.json({ status: "created" });
  } catch (err) {
    console.log("CREATE USER ERROR:", err);
    res.json({ status: "error", message: err.message });
  }
});

// ================= USERS =================
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

// ================= UPDATE =================
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

// ================= DELETE =================
app.post("/admin/delete-user", async (req, res) => {
  try {
    await User.deleteOne({ username: req.body.username });
    res.json({ status: "deleted" });
  } catch (err) {
    console.log("DELETE USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// ================= EXTEND =================
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

// ================= NORMAL API =================
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

// ================= START =================
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
