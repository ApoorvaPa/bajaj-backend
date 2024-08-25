const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const authMiddleware = require("./middlewares/authMiddleware");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = "mongodb://localhost:27017/bajajProject";
const JWT_SECRET = "bajaj";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

app.post("/signup", async (req, res) => {
  const { firstName, lastName, rollNumber, email, password, dob } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const userId = `${firstName}_${lastName}_${dob}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    firstName,
    lastName,
    userId,
    rollNumber,
    email,
    password: hashedPassword,
    dob,
  });

  await user.save();

  const token = jwt.sign(
    { userId: user.userId, email: user.email, rollNumber: user.rollNumber },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.status(201).json({ token, userId: user.userId });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    { userId: user.userId, email: user.email, rollNumber: user.rollNumber },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.status(200).json({ token, userId: user.userId });
});

app.post("/bfhl", authMiddleware, (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      throw new Error("Invalid data format");
    }

    const numbers = data.filter((item) => !isNaN(item));
    const alphabets = data.filter((item) => isNaN(item));
    const lowercaseAlphabets = alphabets.filter(
      (item) => item === item.toLowerCase()
    );

    const highestLowercaseAlphabet = lowercaseAlphabets.length
      ? [lowercaseAlphabets.sort().pop()]
      : [];

    const response = {
      is_success: true,
      user_id: req.user.userId,
      email: req.user.email,
      roll_number: req.user.rollNumber,
      numbers,
      alphabets,
      highest_lowercase_alphabet: highestLowercaseAlphabet,
    };

    res.status(200).json(response);
  } catch (err) {
    res.status(400).json({
      is_success: false,
      message: err.message,
    });
  }
});

app.get("/bfhl", (req, res) => {
  res.status(200).json({
    operation_code: 1,
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
