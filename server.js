import express from "express";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ☁️ Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// ⚙️ Multer setup (for handling file upload)
const upload = multer({ storage: multer.memoryStorage() });

// 📧 Email route
app.post("/send-mail", upload.single("file"), async (req, res) => {
  try {
    const {
      studentName,
      regNumber,
      course,
      batch,
      applicantName,
      email,
      phone,
      message,
      payment_id,
    } = req.body;

    let fileUrl = "";

    // 🔼 Upload to Cloudinary (PDF or any file)
    if (req.file) {
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "student_certificates",
            resource_type: "raw", // ✅ crucial for PDFs / any non-image
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      const result = await uploadPromise;
      fileUrl = result.secure_url;
      console.log("✅ File uploaded to Cloudinary:", fileUrl);
    }

    // 📨 Email configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 📄 Email template
    const htmlBody = `
    <p>Hello Vishwa Vishwani Team,</p>
    <p>Please check the Student Certificate Verification details from the applicant <b>${applicantName}</b></p>
      <table border="1" cellspacing="0" cellpadding="8" align="middle">
        <tbody>
          <tr><th>Student Name</th><td>${studentName}</td></tr>
          <tr><th>Reg Number</th><td>${regNumber}</td></tr>
          <tr><th>Course</th><td>${course}</td></tr>
          <tr><th>Batch</th><td>${batch}</td></tr>
          <tr><th>Applicant Name</th><td>${applicantName}</td></tr>
          <tr><th>Email</th><td>${email}</td></tr>
          <tr><th>Phone</th><td>${phone}</td></tr>
          <tr><th>Message</th><td>${message}</td></tr>
          <tr><th>Payment ID</th><td>${payment_id}</td></tr>
          <tr><th>Attachment File</th><td><a href="${fileUrl}" target="_blank">${fileUrl}</a></td></tr>
        </tbody>
      </table>
    `;

    const mailOptions = {
      from: `"Student Certificate Verification" <${process.env.EMAIL_USER}>`,
      to: "vishwavishwanidrive@gmail.com",
      subject: `Student Verification - ${studentName}`,
      html: htmlBody,
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully!");
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Default route
app.get("/", (req, res) => {
  res.send("Student Verification Backend Running ✅ (Cloudinary Enabled)");
});

// 🚀 Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
});
