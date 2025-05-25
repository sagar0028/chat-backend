const WebSocket = require("ws");
const { redis, subscriber, publisher } = require("./cache");
const { verifyToken } = require("../utils/jwt");
const { rateLimiter } = require("../utils/rateLimiter");
const fileManager = require("../models/files");
const chatService = require("../services/chatService");

class WebSocketManager {
	constructor() {
		this.clients = new Map();
		this.subscribeToRedis();
		console.log("WebSocketManager initialized");
		this.initializeFileManager();
	}

	async initializeFileManager() {
		try {
			await fileManager.initialize();
		} catch (error) {
			console.error("Error initializing file manager:", error);
		}
	}

	initialize(server) {
		this.wss = new WebSocket.Server({ server });
		this.setupWebSocketServer();
		console.log("WebSocket server initialized");
	}

	setupWebSocketServer() {
		this.wss.on("connection", (ws) => {
			console.log("New WebSocket connection established");
			ws.isAlive = true;

			ws.on("pong", () => {
				ws.isAlive = true;
			});

			ws.on("message", async (message) => {
				try {
					const messageStr =
						message instanceof Buffer ? message.toString() : message;
					console.log("Raw message received:", messageStr);
					const data = JSON.parse(messageStr);
					console.log("Parsed message:", data);
					await this.handleMessage(ws, data);
				} catch (error) {
					console.error("Parse error:", error);
					this.sendError(ws, "Invalid message format");
				}
			});

			ws.on("close", () => {
				console.log("WebSocket connection closed, userId:", ws.userId);
				this.handleDisconnect(ws);
			});
		});

		setInterval(() => {
			this.wss.clients.forEach((ws) => {
				if (ws.isAlive === false) {
					console.log("Terminating inactive connection, userId:", ws.userId);
					return ws.terminate();
				}
				ws.isAlive = false;
				ws.ping();
			});
		}, 30000);
	}

	async handleMessage(ws, data) {
		console.log("Handling message:", { type: data.type, userId: ws.userId });

		if (!rateLimiter.checkLimit(ws.userId)) {
			console.log("Rate limit exceeded for userId:", ws.userId);
			return this.sendError(ws, "Rate limit exceeded");
		}

		switch (data.type) {
			case "auth":
				await this.handleAuth(ws, data.token);
				break;
			case "message":
				await this.handleChatMessage(ws, data);
				break;
			case "typing":
				await this.handleTyping(ws, data);
				break;
			case "file":
				await this.handleFileMessage(ws, data);
				break;
			default:
				console.log("Unknown message type:", data.type);
				this.sendError(ws, "Unknown message type");
		}
	}

	async handleAuth(ws, token) {
		try {
			const decoded = verifyToken(token);
			ws.userId = decoded.userId;
			this.clients.set(decoded.userId, ws);
			console.log("User authenticated:", decoded.userId);
			console.log(
				"Current connected clients:",
				Array.from(this.clients.keys())
			);

			this.sendSuccess(ws, "auth");

			this.broadcastUserStatus(decoded.userId, true);

			// Send current online users to the newly connected user
			const onlineUsers = Array.from(this.clients.keys());
			this.sendToClient(ws, {
				type: "initialUserStatus",
				onlineUsers: onlineUsers.map((userId) => ({
					userId,
					isOnline: true,
				})),
			});
		} catch (error) {
			console.error("Authentication failed:", error);
			this.sendError(ws, "Authentication failed");
		}
	}

	async handleChatMessage(ws, data) {
		if (!ws.userId) {
			console.log("Unauthenticated message attempt");
			return this.sendError(ws, "Not authenticated");
		}

		try {
			const message = {
				id: Date.now(),
				sender_id: ws.userId,
				receiver_id: data.receiverId,
				content: data.content,
				created_at: new Date().toISOString(),
				type: "message",
			};

			const savedMessage = await chatService.saveMessage(message);

			// Then publish to Redis for any additional processing
			await publisher.publish("db_messages", JSON.stringify(savedMessage));

			// Send to receiver if online
			const receiverWs = this.clients.get(data.receiverId);
			if (receiverWs) {
				this.sendToClient(receiverWs, {
					type: "message",
					message: savedMessage,
				});
			}

			this.sendToClient(ws, {
				type: "messageConfirmation",
				message: savedMessage,
			});

		} catch (error) {
			console.error("Error handling chat message:", error);
			this.sendError(ws, "Failed to send message");
		}
	}

	handleTyping(ws, data) {
		if (!ws.userId) {
			console.log("Unauthenticated typing event attempt");
			return;
		}

		console.log("Processing typing indicator:", {
			from: ws.userId,
			to: data.receiverId,
			isTyping: data.isTyping,
		});

		const receiverWs = this.clients.get(data.receiverId);
		if (receiverWs) {
			this.sendToClient(receiverWs, {
				type: "typing",
				userId: ws.userId,
				isTyping: Boolean(data.isTyping),
			});
		}
	}

	handleDisconnect(ws) {
		if (ws.userId) {
			console.log("User disconnected:", ws.userId);
			this.clients.delete(ws.userId);

			this.broadcastUserStatus(ws.userId, false);
		}
	}

	broadcastUserStatus(userId, isOnline) {
		const statusMessage = {
			type: "userStatus",
			userId,
			isOnline: Boolean(isOnline),
		};

		this.clients.forEach((client, clientId) => {
			if (clientId !== userId) {
				console.log("Sending status to user:", clientId);
				this.sendToClient(client, statusMessage);
			}
		});
	}

	sendToClient(ws, data) {
		if (ws.readyState === WebSocket.OPEN) {
			console.log("Sending to client:", data);
			ws.send(JSON.stringify(data));
		} else {
			console.log("Client WebSocket not open:", ws.userId);
		}
	}

	sendError(ws, message) {
		this.sendToClient(ws, {
			type: "error",
			message,
		});
	}

	sendSuccess(ws, type) {
		this.sendToClient(ws, {
			type,
			status: "success",
		});
	}

	subscribeToRedis() {
		subscriber.on("message", async (channel, message) => {
			try {
				const parsedMessage = JSON.parse(message);

				if (channel === "db_messages") {
					// For db_messages, just forward to the appropriate clients
					const receiverWs = this.clients.get(parsedMessage.receiver_id);
					if (receiverWs) {
						this.sendToClient(receiverWs, {
							type: "message",
							message: parsedMessage,
						});
					}
				} else if (channel.startsWith("user:")) {
					const userId = channel.split(":")[1];
					const ws = this.clients.get(parseInt(userId));
					if (ws) {
						this.sendToClient(ws, parsedMessage);
					}
				}
			} catch (error) {
				console.error("Error handling Redis message:", error);
			}
		});

		// Subscribe to channels
		subscriber.subscribe("db_messages");
		console.log("Redis subscription initialized");
	}

	async handleRedisMessage(message) {
		try {
			console.log("Processing Redis message:", message);
			const receiverWs = this.clients.get(message.receiver_id);
			if (receiverWs) {
				this.sendToClient(receiverWs, {
					type: "message",
					message,
				});
			}
		} catch (error) {
			console.error("Error handling Redis message:", error);
		}
	}

	async handleFileMessage(ws, data) {
		if (!ws.userId) {
			console.log("Unauthenticated file upload attempt");
			return this.sendError(ws, "Not authenticated");
		}

		try {
			const file = {
				name: data.fileName,
				type: data.fileType,
				size: data.fileSize,
				data: Buffer.from(data.fileData, "base64"),
			};

			console.log("Processing file upload:", {
				from: ws.userId,
				to: data.receiverId,
				fileName: file.name,
				fileType: file.type,
				fileSize: file.size,
			});

			// Save file and get metadata
			const savedFile = await fileManager.saveFile(file, ws.userId);

			const message = {
				senderId: ws.userId,
				receiverId: data.receiverId,
				type: "file",
				fileId: savedFile.id,
				fileName: savedFile.originalName,
				fileType: savedFile.mimeType,
				fileSize: savedFile.size,
				created_at: new Date().toISOString(),
			};

			// Publish to database
			await publisher.publish("db_messages", JSON.stringify(message));

			// Send to receiver if online
			const receiverWs = this.clients.get(data.receiverId);
			if (receiverWs) {
				this.sendToClient(receiverWs, {
					type: "message",
					message,
				});
			}

			// Send confirmation to sender
			this.sendToClient(ws, {
				type: "fileUploaded",
				fileId: savedFile.id,
			});
		} catch (error) {
			console.error("Error handling file message:", error);
			this.sendError(ws, error.message || "Failed to process file");
		}
	}
}

module.exports = new WebSocketManager();
