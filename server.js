const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 MongoDB Connect
mongoose.connect("mongodb+srv://sandbookingord_db_user:Ddotp12345@ddotp-cluster.zqakueo.mongodb.net/ddotp?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// 🔐 Admin login
const ADMIN = {
  username: "admin",
  password: "1234"
};

// 📦 User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  stockyard: String,
  vehicle: String,
  delivery_code: String,
  expiry: Number
});

const User = mongoose.model("User", UserSchema);

// 🌐 Home
app.get("/", (req, res) => {
  res.send("DDOTP Server Running with DB");
});

// 🧠 Admin Page
app.get("/admin", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>DDOTP Admin</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif}
input,select{padding:8px;margin:5px}
button{padding:8px;margin:5px;cursor:pointer}
table{width:100%;margin-top:20px}
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
<th>User</th><th>Password</th><th>Vehicle</th>
<th>Stockyard</th><th>Delivery</th><th>Expiry</th><th>Actions</th>
</tr>
</thead>
<tbody id="table"></tbody>
</table>
</div>

<script>

function adminLogin(){
fetch("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:adminUser.value,password:adminPass.value})})
.then(r=>r.json()).then(d=>{
if(d.status==="success"){
loginBox.style.display="none";
panelBox.style.display="block";
loadUsers();
}else msg.innerText="Invalid";
});
}

function createUser(){
fetch("/admin/create-user",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:username.value,password:password.value,days:days.value})})
.then(r=>r.json()).then(d=>{
alert(JSON.stringify(d));
loadUsers();
});
}

function loadUsers(){
fetch("/admin/users").then(r=>r.json()).then(data=>{
let html="";
for(let u in data){
let e=new Date(data[u].expiry).toLocaleString();
html+=\`
<tr>
<td>\${u}</td>
<td><input value="\${data[u].password}" id="p_\${u}"></td>
<td><input value="\${data[u].vehicle||""}" id="v_\${u}"></td>
<td><input value="\${data[u].stockyard||""}" id="s_\${u}"></td>
<td><input value="\${data[u].delivery_code||""}" id="d_\${u}"></td>
<td>\${e}</td>
<td>
<button onclick="updateUser('\${u}')">Update</button>
<button onclick="deleteUser('\${u}')">Delete</button>
<button onclick="extendUser('\${u}',1)">+1</button>
<button onclick="extendUser('\${u}',7)">+7</button>
</td>
</tr>\`;
}
table.innerHTML=html;
});
}

function updateUser(u){
fetch("/admin/update-user",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:u,
vehicle:document.getElementById("v_"+u).value,
stockyard:document.getElementById("s_"+u).value,
delivery_code:document.getElementById("d_"+u).value
})}).then(()=>loadUsers());
}

function deleteUser(u){
fetch("/admin/delete-user",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:u})}).then(()=>loadUsers());
}

function extendUser(u,d){
fetch("/admin/extend-user",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:u,days:d})}).then(()=>loadUsers());
}

</script>

</body>
</html>`);
});

// 🔐 Admin login
app.post("/admin/login",(req,res)=>{
const {username,password}=req.body;
if(username===ADMIN.username && password===ADMIN.password)
return res.json({status:"success"});
res.json({status:"invalid"});
});

// ➕ Create user
app.post("/admin/create-user", async (req,res)=>{
const {username,password,days}=req.body;
if(!username||!password) return res.json({status:"missing"});

const exist=await User.findOne({username});
if(exist) return res.json({status:"exists"});

const expiry=Date.now()+(days*86400000);

await User.create({
username,password,stockyard:"",vehicle:"",delivery_code:"",expiry
});

res.json({status:"created"});
});

// 📄 Users list
app.get("/admin/users", async (req,res)=>{
const users=await User.find();
let out={};
users.forEach(u=>out[u.username]=u);
res.json(out);
});

// 🔄 Update
app.post("/admin/update-user", async (req,res)=>{
const {username,vehicle,stockyard,delivery_code}=req.body;
await User.updateOne({username},{vehicle,stockyard,delivery_code});
res.json({status:"updated"});
});

// ❌ Delete
app.post("/admin/delete-user", async (req,res)=>{
await User.deleteOne({username:req.body.username});
res.json({status:"deleted"});
});

// ⏳ Extend expiry
app.post("/admin/extend-user", async (req,res)=>{
const {username,days}=req.body;
const user=await User.findOne({username});
if(!user) return res.json({status:"not_found"});
user.expiry += days*86400000;
await user.save();
res.json({status:"extended"});
});

// 📡 API
app.get("/api/user/stockyard/:username", async (req,res)=>{
const user=await User.findOne({username:req.params.username});
if(!user) return res.json({status:"error"});
if(Date.now()>user.expiry) return res.json({status:"expired"});

res.json({
status:"success",
stockyard:user.stockyard||"",
vehicle:user.vehicle||"",
delivery_code:user.delivery_code||""
});
});

// 🚀 Start
app.listen(process.env.PORT,()=>console.log("Server running with MongoDB..."));
