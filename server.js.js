const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN = {
    username: "admin",
    password: "1234"
};

let users = {};

// Admin login
app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN.username && password === ADMIN.password) {
        return res.json({ status: "success" });
    }

    res.json({ status: "invalid" });
});

// Create user
app.post("/admin/create-user", (req, res) => {
    const { username, password } = req.body;

    if (users[username]) {
        return res.json({ status: "exists" });
    }

    users[username] = {
        password,
        stockyard: "",
        vehicle: "",
        delivery_code: ""
    };

    res.json({ status: "created" });
});

// Update user
app.post("/admin/update-user", (req, res) => {
    const { username, stockyard, vehicle, delivery_code } = req.body;

    if (!users[username]) {
        return res.json({ status: "error" });
    }

    users[username] = {
        ...users[username],
        stockyard,
        vehicle,
        delivery_code
    };

    res.json({ status: "updated" });
});

// Get API (script use)
app.get("/api/user/stockyard/:username", (req, res) => {
    const user = users[req.params.username];

    if (!user) return res.json({ status: "error" });

    res.json({
        status: "success",
        stockyard: user.stockyard,
        vehicle: user.vehicle,
        delivery_code: user.delivery_code
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("DDOTP running...");
});