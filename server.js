const express = require("express");
const app = express();

app.use(express.json());

const ADMIN = {
    username: "admin",
    password: "1234"
};

let users = {};

app.get("/", (req, res) => {
    res.send("DDOTP Server Running");
});

app.get("/otp", (req, res) => {
    res.json({ otp: 1234 });
});

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

    if (!username || !password) {
        return res.json({ status: "missing_fields" });
    }

    if (users[username]) {
        return res.json({ status: "exists" });
    }

    users[username] = {
        password,
        stockyard: "",
        vehicle: "",
        delivery_code: ""
    };

    res.json({ status: "created", user: users[username] });
});

// Get all users
app.get("/admin/users", (req, res) => {
    res.json(users);
});

// Update user
app.post("/admin/update-user", (req, res) => {
    const { username, stockyard, vehicle, delivery_code } = req.body;

    if (!users[username]) {
        return res.json({ status: "not_found" });
    }

    users[username].stockyard = stockyard || "";
    users[username].vehicle = vehicle || "";
    users[username].delivery_code = delivery_code || "";

    res.json({ status: "updated", user: users[username] });
});

// Delete user
app.post("/admin/delete-user", (req, res) => {
    const { username } = req.body;

    if (!users[username]) {
        return res.json({ status: "not_found" });
    }

    delete users[username];
    res.json({ status: "deleted" });
});

// Script API
app.get("/api/user/stockyard/:username", (req, res) => {
    const user = users[req.params.username];

    if (!user) {
        return res.json({ status: "error" });
    }

    res.json({
        status: "success",
        stockyard: user.stockyard,
        vehicle: user.vehicle,
        delivery_code: user.delivery_code
    });
});

app.listen(process.env.PORT, () => {
    console.log("Server running...");
});
