import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js"; 
import connectToMongoDB from "./db/connectToMongoDb.js";
import cookieParser from "cookie-parser";
import http from "http";
import cors from "cors";  
import { Server } from "socket.io";  
import Message from './models/message.model.js'; 

dotenv.config();
const app = express();
const server = http.createServer(app);

// Enable CORS for Express routes
app.use(cors({
    origin: "http://localhost:5174",  
    credentials: true 
}));

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5001;

// MongoDB connection
connectToMongoDB();

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5174",  
        methods: ["GET", "POST"],         
        credentials: true                 
    }
});

// Store connected users
const connectedUsers = new Map(); // Map to store connected users

// Socket.io connection
io.on("connection", (socket) => {
    console.log("New client connected");

    // Join room based on user's username
    socket.on("join_room", (username) => {
        socket.join(username);
        connectedUsers.set(socket.id, username); // Track connected users
        console.log(`${username} joined the room`);
    });

    // Handle joining a random user
    socket.on("join_random", () => {
        const currentUser = connectedUsers.get(socket.id); // Get the current user
        const otherUsers = [...connectedUsers.values()].filter(user => user !== currentUser); // Get other connected users

        if (otherUsers.length > 0) {
            const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)]; // Select a random user
            socket.join(randomUser); // Join the random user's room
            socket.emit("connected_random", randomUser); // Notify the current user of the connection
            console.log(`${currentUser} connected with ${randomUser}`);
        } else {
            socket.emit("no_users", "No other users are available for chat right now."); // Notify if no users are available
        }
    });

    // Listen for message sending
    socket.on("send_message", async (messageData) => {
        console.log("Message received:", messageData);
        
        // Broadcast the message to both sender and recipient
        io.to(messageData.to).emit("receive_message", messageData);
        io.to(messageData.from).emit("receive_message", messageData);

        // Save the message to the database
        try {
            const newMessage = new Message({
                from: messageData.from,
                to: messageData.to,
                text: messageData.text,
            });
            await newMessage.save();
            console.log("Message saved to the database");
        } catch (error) {
            console.error("Error saving message:", error.message);
        }
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
        connectedUsers.delete(socket.id); // Remove user from connected users map
    });
});

app.get("/", (req, res) => {
    res.send("Hello World");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});






