const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("DDOTP Server Running");
});

app.get("/otp", (req, res) => {
    res.json({ otp: 1234 });
});

app.listen(process.env.PORT, () => {
    console.log("Server running...");
});
