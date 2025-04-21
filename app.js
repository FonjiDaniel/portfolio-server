const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const cors = require("cors");
const validator = require("validator");

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());

app.use(express.json());

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587", 10), 
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },

});

transporter.verify(function (error, success) {
    if (error) {
        console.error("Error connecting to email server:", error);
    } else {
        console.log("Email server is ready to take messages");
    }
});


// --- Email Sending Function ---
const sendEmail = async (senderEmail, senderName, messageContent) => {

    const mailOptions = {
        from: `"${senderName}" <${process.env.EMAIL_USER}>`, 
        replyTo: `${senderName} <${senderEmail}>`,
        to: process.env.EMAIL_RECEIVER,
        subject: `New Contact Form Message from ${senderName}`,
        text: `You received a message from:\nName: ${senderName}\nEmail: ${senderEmail}\n\nMessage:\n${messageContent}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${senderName}</p>
            <p><strong>Email:</strong> <a href="mailto:${senderEmail}">${senderEmail}</a></p>
            <hr>
            <p><strong>Message:</strong></p>
            <p>${messageContent.replace(/\n/g, "<br>")}</p>
        `, 
    };

    try {
        // Send mail with defined transport object
        console.log("Attempting to send email:", mailOptions);
        let info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);

        return info; 
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; 
    }
};

// --- Routes ---
const emailRouter = express.Router();

emailRouter.post("/send", async (req, res) => {
    const { sender = '', name = '', message = '' } = req.body;

    if(!validator.isEmail(sender)) {
        return res.status(400).json({error: "Invalid Email Address"})
    }

    if (!sender || !name || !message) {
         console.error("Validation Failed: Missing or invalid fields");
         return res.status(400).json({ success: false, message: "Bad Request: Missing or invalid fields (sender, name, message)." });
    }

    try {
        await sendEmail(sender, name, message);
        console.log(`Email successfully sent from ${name} <${sender}>`);
        res.status(200).json({ success: true, message: "Email sent successfully!" });
    } catch (error) {
        console.error("Failed to send email from route:", error);
        res.status(500).json({ success: false, message: "Internal Server Error: Failed to send email." });
    }
});


app.use("/api", emailRouter);


app.get("/", (req, res) => {
    res.send(`Server is running on Port ${process.env.PORT || 'Not Set'}`);
    console.log("Root path '/' accessed.");
});


if (require.main === module) {
    const PORT = process.env.PORT 
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}


module.exports = app;