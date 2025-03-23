const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, url, dbName } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      url,
      dbName,
    });

    await newUser.save();
    const token = jwt.sign(
      { email, name, url, dbName },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    res.status(201).json(token);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ message: "Error creating user", error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    console.log(user);
    const token = jwt.sign(
      { email, name: user.name, url: user.url, dbName: user.dbName },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    res.status(201).json(token);
  } catch (err) {
    console.log(e);
    res.status(500).json({ message: "Login error", error: err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const storedOTP = await OTPModel.findOne({ phone, otp });

    if (!storedOTP || storedOTP.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ phone });
    console.log(user);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const token = generateToken(user);
    res.json({ message: "OTP verified successfully. Login complete.", token });
  } catch (err) {
    res
      .status(500)
      .json({ message: "OTP verification error", error: err.message });
  }
});

module.exports = router;
