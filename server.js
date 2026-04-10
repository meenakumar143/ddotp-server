const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

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
  expiry: Number
}));

// Home
app.get("/", (req, res) => {
  res.send("DDOTP Running");
});


// 🔥 AUTOFILL2 (NEW - NO CACHE)
app.get("/autofill2", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>DDOTP Auto Fill V2</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;padding:20px}
input{display:block;margin:10px 0;padding:10px;width:300px}
button{padding:10px;margin-top:10px}
</style>
</head>
<body>

<h2>Auto Fill Demo V2</h2>

<input id="username" placeholder="Enter Username">
<button id="btn">Load & Auto Fill</button>

<hr>

<label>Stockyard</label>
<input id="stockyard">

<label>Vehicle</label>
<input id="vehicle">

<label>Delivery Code</label>
<input id="delivery_code">

<script>
document.getElementById("btn").onclick = async function () {

  const u = document.getElementById("username").value.trim();

  if (!u) {
    alert("Enter username");
    return;
  }

  alert("Fetching for: " + u);

  try {
    const res = await fetch("/api/user/stockyard/" + encodeURIComponent(u));
    const data = await res.json();

    alert("Response: " + JSON.stringify(data));

    if (data.status !== "success") {
      alert("User not valid / expired / not found");
      return;
    }

    document.getElementById("stockyard").value = data.stockyard || "";
    document.getElementById("vehicle").value = data.vehicle || "";
    document.getElementById("delivery_code").value = data.delivery_code || "";

    alert("Filled Successfully");

  } catch (e) {
    alert("Error: " + e.message);
  }

};
</script>

</body>
</html>
  `);
});


// CREATE USER
app.post("/admin/create-user", async (req, res) => {
  const { username, password, days } = req.body;

  if (!username || !password) return res.json({ status: "missing" });

  const exist = await User.findOne({ username });
  if (exist) return res.json({ status: "exists" });

  const expiry = Date.now() + (parseInt(days) * 86400000);

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

  user.expiry += parseInt(days) * 86400000;
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
