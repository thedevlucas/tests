// Enhanced Chat Routes - Senior Developer Implementation
import express from "express";
import { errorHandler } from "../../config/CustomError";
import { verifyToken } from "../../helpers/Token";
import { enhancedChatService } from "../../services/chat/EnhancedChatService";
import { Chat } from "../../models/Chat";
import { Debtor } from "../../models/Debtor";
import { Op } from "sequelize";
import { twilio_whatsapp_number } from "../../config/Constants";

const router = express.Router();

// Simple test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Enhanced Chat API is working!" });
});

// Get all chats for a user with pagination
router.get("/chats", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`📱 Getting chats for user ${userId}, limit: ${limit}, offset: ${offset}`);

    const chats = await enhancedChatService.getChatsByUser(userId, limit, offset);
    
    res.json({
      success: true,
      data: chats,
      pagination: {
        limit,
        offset,
        total: chats.length
      }
    });
  } catch (error) {
    console.error("❌ Error getting chats:", error);
    errorHandler(error, res);
  }
});

// Get chat history with specific debtor
router.get("/chats/:phoneNumber", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const phoneNumber = parseInt(req.params.phoneNumber);
    const limit = parseInt(req.query.limit as string) || 100;

    console.log(`📱 Getting chat history for user ${userId} with debtor ${phoneNumber}`);

    const chatHistory = await enhancedChatService.getChatHistory(userId, phoneNumber, limit);
    
    res.json({
      success: true,
      data: chatHistory,
      debtor_phone: phoneNumber
    });
  } catch (error) {
    console.error("❌ Error getting chat history:", error);
    errorHandler(error, res);
  }
});

// Send message to debtor
router.post("/chats/:phoneNumber/send", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const phoneNumber = parseInt(req.params.phoneNumber);
    const { message, message_type = 'text', media_url } = req.body;

    console.log(`📤 Sending message from user ${userId} to debtor ${phoneNumber}`);

    if (!message && !media_url) {
      return res.status(400).json({
        success: false,
        message: "No se envió ningún mensaje"
      });
    }

    const result = await enhancedChatService.sendMessage(
      userId, 
      phoneNumber, 
      message, 
      message_type, 
      media_url
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    errorHandler(error, res);
  }
});

// Get chat statistics
router.get("/statistics", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);

    console.log(`📊 Getting chat statistics for user ${userId}`);

    const statistics = await enhancedChatService.getChatStatistics(userId);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error("❌ Error getting chat statistics:", error);
    errorHandler(error, res);
  }
});

// Get recent conversations
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const limit = parseInt(req.query.limit as string) || 20;

    console.log(`💬 Getting recent conversations for user ${userId}`);

    // Return mock data for now
    const conversations = [
      {
        id: "conv-1",
        debtorName: "Juan Pérez",
        phoneNumber: "+593 987654321",
        lastMessage: "Hola, necesito información sobre mi deuda",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 2,
        avatarUrl: undefined,
        debtorId: 1
      },
      {
        id: "conv-2", 
        debtorName: "María García",
        phoneNumber: "+593 912345678",
        lastMessage: "¿Cuándo puedo pagar?",
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
        avatarUrl: undefined,
        debtorId: 2
      }
    ];
    
    res.json(conversations);
  } catch (error) {
    console.error("❌ Error getting recent conversations:", error);
    errorHandler(error, res);
  }
});

// Get chat statistics
router.get("/statistics", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    console.log(`📊 Getting chat statistics for user ${userId}`);

    // Return mock statistics
    const statistics = {
      totalConversations: 15,
      unreadMessages: 8,
      todayMessages: 12,
      thisWeekMessages: 45,
      responseRate: 85.5,
      averageResponseTime: "2.5 minutos"
    };
    
    res.json(statistics);
  } catch (error) {
    console.error("❌ Error getting chat statistics:", error);
    errorHandler(error, res);
  }
});

// Mark messages as read
router.put("/chats/:phoneNumber/read", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const phoneNumber = parseInt(req.params.phoneNumber);

    console.log(`👁️ Marking messages as read for user ${userId} with debtor ${phoneNumber}`);

    const result = await enhancedChatService.markMessagesAsRead(userId, phoneNumber);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    errorHandler(error, res);
  }
});

// Delete conversation
router.delete("/chats/:phoneNumber", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const phoneNumber = parseInt(req.params.phoneNumber);

    console.log(`🗑️ Deleting conversation for user ${userId} with debtor ${phoneNumber}`);

    const result = await enhancedChatService.deleteConversation(userId, phoneNumber);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("❌ Error deleting conversation:", error);
    errorHandler(error, res);
  }
});

// Search messages
router.get("/search", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.idToken);
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'q' is required"
      });
    }

    console.log(`🔍 Searching messages for user ${userId} with query: ${query}`);

    // Search in MongoDB
    const searchResults = await Chat.find({
      id_user: userId,
      message: { $regex: query, $options: 'i' },
      status: true
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id from_cellphone to_cellphone message createdAt status message_type media_url');

    // Get debtor information for each result
    const enhancedResults = await Promise.all(
      searchResults.map(async (chat: any) => {
        const debtor = await Debtor.findOne({
          where: {
            id_user: userId,
            cellphones: { [Op.contains]: [{ to: chat.from_cellphone }] }
          }
        });

        return {
          id: chat._id,
          message: chat.message,
          from_cellphone: chat.from_cellphone,
          to_cellphone: chat.to_cellphone,
          debtor_name: debtor?.name || 'Unknown',
          message_type: chat.message_type || 'text',
          status: chat.status ? 'delivered' : 'failed',
          timestamp: chat.createdAt,
          is_from_debtor: chat.from_cellphone !== parseInt(twilio_whatsapp_number?.replace('+', '') || '0'),
          media_url: chat.media_url,
          media_type: chat.media_type
        };
      })
    );
    
    res.json({
      success: true,
      data: enhancedResults,
      query,
      total: enhancedResults.length
    });
  } catch (error) {
    console.error("❌ Error searching messages:", error);
    errorHandler(error, res);
  }
});

export default router;
