const express = require("express");
const app = express();

app.use(express.json());

// Sample OTP storage (temporary)
let otpStore = {};

// Generate OTP API
app.get("/otp", (req, res) => {
    const user = req.query.user || "default";

    const otp = Math.floor(1000 + Math.random() * 9000);
    otpStore[user] = otp;

    res.json({
        status: "success",
        user: user,
        otp: otp
    });
});

// Get OTP API
app.get("/get-otp", (req, res) => {
    const user = req.query.user || "default";

    res.json({
        otp: otpStore[user] || null
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
