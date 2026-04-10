const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

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
  username: String,
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


// ================= AUTO PAGE =================
app.get("/autofill", async (req, res) => {
  const username = String(req.query.username || "").trim();

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP AUTO</title>
<style>
body{background:#0d1117;color:#fff;font-family:sans-serif;padding:20px}
input{display:block;margin:10px 0;padding:10px;width:300px}
.status{margin:10px 0;color:#ffd166}
</style>
</head>
<body>

<h2>DDOTP AUTO ⚡</h2>

<div class="status" id="status">Loading...</div>

<input id="stockyard" placeholder="stockyard">
<input id="vehicle" placeholder="vehicle">
<input id="delivery_code" placeholder="delivery">

<script>
async function load(){

  try{
    const res = await fetch("/api/user/stockyard/${username}");
    const data = await res.json();

    if(data.status==="success"){
      document.getElementById("stockyard").value = data.stockyard;
      document.getElementById("vehicle").value = data.vehicle;
      document.getElementById("delivery_code").value = data.delivery_code;
      document.getElementById("status").innerText = "Updated ✅";
    }else{
      document.getElementById("status").innerText = data.status;
    }

  }catch(e){
    document.getElementById("status").innerText = "Error";
  }
}

// auto refresh
setInterval(load, 2000);
load();
</script>

</body>
</html>
`);
});


// ================= API =================
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


// ================= LOGIN FORM =================
app.get("/login", (req, res) => {
  res.send(`
<form method="POST" action="/login">
<input name="username" placeholder="username">
<input name="password" placeholder="password">
<button>Login</button>
</form>
`);
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password
  });

  if (!user) return res.send("Invalid");

  res.redirect("/autofill?username=" + user.username);
});


// ================= ADMIN =================
app.post("/admin/create-user", async (req, res) => {
  const { username, password, days } = req.body;

  await User.create({
    username,
    password,
    stockyard: "",
    vehicle: "",
    delivery_code: "",
    expiry: Date.now() + (days * 86400000)
  });

  res.json({ status: "created" });
});


// ================= START =================
app.listen(process.env.PORT, () => {
  console.log("Server running...");
});
