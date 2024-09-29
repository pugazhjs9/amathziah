import express from "express";
import Message from "../models/message.model.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Get messages between two users
router.get("/:loggedInUsername/:recipientUsername", async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { loggedInUsername, recipientUsername } = req.params; // Get both parameters from the URL

        console.log(loggedInUsername, recipientUsername); // Log both usernames for debugging

        // Fetch messages between the two users
        const messages = await Message.find({
            $or: [
                { from: loggedInUsername, to: recipientUsername },
                { from: recipientUsername, to: loggedInUsername },
            ],
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


export default router;



