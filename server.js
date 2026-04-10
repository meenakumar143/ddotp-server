const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 MongoDB Connect
mongoose.connect("mongodb+srv://sandbookingord_db_user:TzsFjhlxFvhbwXbo@ddotp-cluster.zqakueo.mongodb.net/ddotp?retryWrites=true&w=majority")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// 🔐 Admin
const ADMIN = {
    username: "admin",
    password: "1234"
};

// 📦 User Schema
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    stockyard: String,
    vehicle: String,
    delivery_code: String,
    expiry: Number
});

const User = mongoose.model("User", UserSchema);

// 🌐 Routes

app.get("/", (req, res) => {
    res.send("DDOTP Server Running with DB");
});

// 🔐 Admin login
app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN.username && password === ADMIN.password) {
        return res.json({ status: "success" });
    }

    res.json({ status: "invalid" });
});

// ➕ Create user
app.post("/admin/create-user", async (req, res) => {
    const { username, password, days } = req.body;

    const exist = await User.findOne({ username });
    if (exist) return res.json({ status: "exists" });

    const expiry = Date.now() + ((days || 1) * 86400000);

    const user = new User({
        username,
        password,
        stockyard: "",
        vehicle: "",
        delivery_code: "",
        expiry
    });

    await user.save();

    res.json({ status: "created" });
});

// 📄 Get users
app.get("/admin/users", async (req, res) => {
    const users = await User.find();
    let result = {};

    users.forEach(u => {
        result[u.username] = u;
    });

    res.json(result);
});

// 🔄 Update user
app.post("/admin/update-user", async (req, res) => {
    const { username, stockyard, vehicle, delivery_code } = req.body;

    await User.updateOne(
        { username },
        { stockyard, vehicle, delivery_code }
    );

    res.json({ status: "updated" });
});

// ❌ Delete user
app.post("/admin/delete-user", async (req, res) => {
    const { username } = req.body;

    await User.deleteOne({ username });

    res.json({ status: "deleted" });
});

// 📡 API (script use cheyedi)
app.get("/api/user/stockyard/:username", async (req, res) => {
    const user = await User.findOne({ username: req.params.username });

    if (!user) return res.json({ status: "error" });

    if (Date.now() > user.expiry) {
        return res.json({ status: "expired" });
    }

    res.json({
        status: "success",
        stockyard: user.stockyard,
        vehicle: user.vehicle,
        delivery_code: user.delivery_code
    });
});

// 🚀 Start
app.listen(process.env.PORT, () => {
    console.log("Server running with MongoDB...");
});
