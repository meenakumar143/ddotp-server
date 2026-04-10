const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== MongoDB =====
mongoose.connect("mongodb+srv://sandbookingord_db_user:Ddotp12345@ddotp-cluster.zqakueo.mongodb.net/ddotp?retryWrites=true&w=majority")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log("MongoDB Error:", err));

// ===== Schema =====
const User = mongoose.model("User", new mongoose.Schema({
  username:String,
  password:String,
  stockyard:String,
  vehicle:String,
  delivery_code:String,
  expiry:Number,
  token:String
}));

// ===== HOME =====
app.get("/", (req,res)=>{
  res.send("DDOTP Running...");
});

// ===== LOGIN PAGE =====
app.get("/login", (req,res)=>{
  res.send(`
  <h2>Login</h2>
  <form method="POST" action="/user/login">
  <input name="username" placeholder="username"><br>
  <input name="password" placeholder="password" type="password"><br>
  <button>Login</button>
  </form>
  `);
});

// ===== LOGIN =====
app.post("/user/login", async (req,res)=>{
  const {username,password} = req.body;

  const user = await User.findOne({username});

  if(!user) return res.send("User not found");
  if(user.password !== password) return res.send("Wrong password");
  if(Date.now() > user.expiry) return res.send("Expired");

  const token = crypto.randomBytes(24).toString("hex");
  user.token = token;
  await user.save();

  res.redirect("/dashboard?token="+token);
});

// ===== DASHBOARD (AUTO REFRESH FIXED) =====
app.get("/dashboard", async (req,res)=>{
  const token = req.query.token;

  const user = await User.findOne({token});

  if(!user) return res.send("Invalid token");

  res.send(`
  <html>
  <head>
  <title>Dashboard</title>
  <style>
  body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
  input{display:block;margin:10px 0;padding:10px;width:300px}
  </style>
  </head>

  <body>

  <h2>DDOTP Secure Dashboard</h2>

  <label>Stockyard</label>
  <input id="stockyard" value="${user.stockyard || ""}">

  <label>Vehicle</label>
  <input id="vehicle" value="${user.vehicle || ""}">

  <label>Delivery Code</label>
  <input id="delivery_code" value="${user.delivery_code || ""}">

  <script>
  const token = "${token}";

  async function loadData(){
    try{
      const res = await fetch("/secure-data?token=" + token);
      const d = await res.json();

      if(d.status === "success"){
        document.getElementById("stockyard").value = d.stockyard || "";
        document.getElementById("vehicle").value = d.vehicle || "";
        document.getElementById("delivery_code").value = d.delivery_code || "";
      }
    }catch(e){
      console.log("error",e);
    }
  }

  loadData();
  setInterval(loadData,2000);
  </script>

  </body>
  </html>
  `);
});

// ===== SECURE DATA =====
app.get("/secure-data", async (req,res)=>{
  const token = req.query.token;

  const user = await User.findOne({token});

  if(!user) return res.json({status:"error"});
  if(Date.now() > user.expiry) return res.json({status:"expired"});

  res.json({
    status:"success",
    stockyard:user.stockyard,
    vehicle:user.vehicle,
    delivery_code:user.delivery_code
  });
});

// ===== ADMIN LOGIN =====
app.post("/admin/login",(req,res)=>{
  if(req.body.username==="admin" && req.body.password==="1234"){
    return res.json({status:"success"});
  }
  res.json({status:"invalid"});
});

// ===== ADMIN PANEL =====
app.get("/admin",(req,res)=>{
  res.send(`
  <h2>Admin</h2>
  <input id="u" placeholder="username">
  <input id="p" placeholder="password">
  <button onclick="create()">Create</button>
  <button onclick="load()">Load</button>

  <div id="data"></div>

<script>

function create(){
fetch("/admin/create-user",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:document.getElementById("u").value,
password:document.getElementById("p").value
})
})
.then(r=>r.json()).then(d=>alert(JSON.stringify(d)));
}

function load(){
fetch("/admin/users")
.then(r=>r.json())
.then(d=>{
let html="";
for(let u in d){
html+=u+" "+d[u].vehicle+" "+d[u].stockyard+"<br>";
}
document.getElementById("data").innerHTML=html;
});
}

</script>
  `);
});

// ===== CREATE USER =====
app.post("/admin/create-user", async (req,res)=>{
  const {username,password} = req.body;

  const exist = await User.findOne({username});
  if(exist) return res.json({status:"exists"});

  await User.create({
    username,
    password,
    stockyard:"",
    vehicle:"",
    delivery_code:"",
    expiry: Date.now() + (7*86400000)
  });

  res.json({status:"created"});
});

// ===== USERS =====
app.get("/admin/users", async (req,res)=>{
  const users = await User.find();
  let out = {};
  users.forEach(u=>out[u.username]=u);
  res.json(out);
});

// ===== UPDATE =====
app.post("/admin/update-user", async (req,res)=>{
  const {username,vehicle,stockyard,delivery_code} = req.body;

  await User.updateOne(
    {username},
    {vehicle,stockyard,delivery_code}
  );

  res.json({status:"updated"});
});

// ===== API =====
app.get("/api/user/stockyard/:username", async (req,res)=>{
  const user = await User.findOne({username:req.params.username});

  if(!user) return res.json({status:"error"});
  if(Date.now() > user.expiry) return res.json({status:"expired"});

  res.json({
    status:"success",
    stockyard:user.stockyard,
    vehicle:user.vehicle,
    delivery_code:user.delivery_code
  });
});

// ===== START =====
app.listen(process.env.PORT, ()=>{
  console.log("Server running...");
});
