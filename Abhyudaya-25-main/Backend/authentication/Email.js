const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { User } = require("../Models/User");

dotenv.config();




const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

let otps = {};

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.USERMAIL,
    pass: process.env.USERPASS,
  },



});

// Send OTP
const Send = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    console.log("Received email for OTP:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });
    console.log("User found:", user);   

    if (user) {
      return res.status(409).json({
        message: "Email already exists. Please use another email.",
      });
    }

    const otp = generateOTP();
    const expirationTime = Date.now() + 10 * 60 * 1000;

    const mailOptions = {
      from: process.env.USERMAIL,
      to: email,
      subject: "OTP Verification Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center;">
          <img src="https://i.postimg.cc/2SVKDZtL/Abhyudaya.png"
               alt="Abhyudaya" style="width: 150px; margin-bottom: 20px;">
          <h2>OTP Verification Email</h2>
          <p>Dear User,</p>
          <p>Thank you for registering with Abhyudaya. Use the following OTP to verify your email:</p>
          <p style="font-size: 32px; font-weight: bold;">${otp}</p>
          <p>This OTP is valid for 10 minutes. If you did not request it, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Store OTP only after the email is sent successfully
    otps[email] = { otp, expirationTime };

    return res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ message: "Failed to send OTP." });
  }
};

// Verify OTP
const Verify = (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = String(req.body.otp || "");
  const record = otps[email];

  if (!record) {
    return res.status(400).json({ message: "No OTP found for this email." });
  }

  const { otp: storedOtp, expirationTime } = record;

  if (Date.now() > expirationTime) {
    delete otps[email];
    return res.status(400).json({ message: "OTP has expired." });
  }

  if (storedOtp === otp) {
    delete otps[email];
    return res.status(200).json({ message: "OTP verified successfully." });
  }

  return res.status(400).json({ message: "Invalid OTP." });
};

// Send Contact Email
const sendContactEmail = async (req, res) => {
  try {
    const { fullName, email, phone, message } = req.body;

    const mailOptions = {
      from: process.env.USERMAIL,
      to: process.env.USERMAIL,
      replyTo: email,
      subject: "New Contact Us Message",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2>New Contact Us Message</h2>
          <p><strong>Name:</strong> ${fullName || ""}</p>
          <p><strong>Email:</strong> ${email || ""}</p>
          <p><strong>Phone:</strong> ${phone || ""}</p>
          <p><strong>Message:</strong> ${message || ""}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Contact email sent successfully." });
  } catch (error) {
    console.error("Contact email error:", error);
    return res.status(500).json({ message: "Failed to send contact email." });
  }
};

module.exports = { Send, Verify, sendContactEmail };