const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("DDOTP Server Running");
});

app.get("/otp", (req, res) => {
    res.json({ otp: 1234 });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running...");
});
