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

// SERVER-SIDE AUTOFILL PAGE
app.get("/autofill3", async (req, res) => {
  const username = String(req.query.username || "").trim();

  let stockyard = "";
  let vehicle = "";
  let delivery_code = "";
  let message = "Username enter chesi Load chey.";

  if (username) {
    try {
      const user = await User.findOne({ username });

      if (!user) {
        message = "User not found.";
      } else if (Date.now() > user.expiry) {
        message = "User expired.";
      } else {
        stockyard = user.stockyard || "";
        vehicle = user.vehicle || "";
        delivery_code = user.delivery_code || "";
        message = "Data loaded successfully.";
      }
    } catch (e) {
      message = "Error: " + e.message;
    }
  }

  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>DDOTP Auto Fill 3</title>
  <style>
    body { background:#111; color:#fff; font-family:sans-serif; padding:20px; }
    input, button { display:block; margin:10px 0; padding:10px; width:320px; }
    .msg { margin:15px 0; color:#ffd166; }
  </style>
</head>
<body>

  <h2>DDOTP Auto Fill 3</h2>

  <form method="GET" action="/autofill3">
    <label>Username</label>
    <input name="username" value="${username.replace(/"/g, "&quot;")}" placeholder="Enter Username">
    <button type="submit">Load</button>
  </form>

  <div class="msg">${message}</div>

  <label>Stockyard</label>
  <input value="${stockyard.replace(/"/g, "&quot;")}" readonly>

  <label>Vehicle</label>
  <input value="${vehicle.replace(/"/g, "&quot;")}" readonly>

  <label>Delivery Code</label>
  <input value="${delivery_code.replace(/"/g, "&quot;")}" readonly>

</body>
</html>`);
});

// CREATE USER
app.post("/admin/create-user", async (req, res) => {
  try {
    const { username, password, days } = req.body;

    if (!username || !password) return res.json({ status: "missing" });

    const exist = await User.findOne({ username });
    if (exist) return res.json({ status: "exists" });

    const expiry = Date.now() + (parseInt(days || 1, 10) * 86400000);

    await User.create({
      username,
      password,
      stockyard: "",
      vehicle: "",
      delivery_code: "",
      expiry
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

    res.json({ status: "extended" });
  } catch (err) {
    console.log("EXTEND USER ERROR:", err);
    res.json({ status: "error" });
  }
});

// API
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
