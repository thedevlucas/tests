// Enhanced Chat Service - Senior Developer Implementation
import { Chat } from "../../models/Chat";
import { Debtor } from "../../models/Debtor";
import { User } from "../../models/User";
import { Cost } from "../../models/Cost";
import { PendingMessage } from "../../models/PendingMessage";
import { twilio_whatsapp_number } from "../../config/Constants";
import { sendWhatsappMessage } from "./WhatsAppService";
import { httpError } from "../../config/CustomError";
import { Op } from "sequelize";

// Enhanced Chat Interface
export interface EnhancedChatMessage {
  id: string;
  message: string;
  from_cellphone: number;
  to_cellphone: number;
  from_debtor_name?: string;
  to_debtor_name?: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  cost?: number;
  is_from_debtor: boolean;
  media_url?: string;
  media_type?: string;
}

// Chat Statistics Interface
export interface ChatStatistics {
  totalMessages: number;
  totalCost: number;
  successRate: number;
  averageResponseTime: number;
  activeConversations: number;
  pendingMessages: number;
}

// Enhanced Chat Service Class
export class EnhancedChatService {
  
  // Get all chats for a user with enhanced information
  async getChatsByUser(userId: number, limit: number = 50, offset: number = 0) {
    try {
      const chats = await Chat.find({
        id_user: userId,
        status: true
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('_id from_cellphone to_cellphone message createdAt status message_type media_url');

      // Get debtor information for each chat
      const enhancedChats = await Promise.all(
        chats.map(async (chat: any) => {
          const debtor = await Debtor.findOne({
            where: {
              id_user: userId,
              [Op.or]: [
                { cellphones: { [Op.contains]: [{ to: chat.from_cellphone }] } },
                { cellphones: { [Op.contains]: [{ to: chat.to_cellphone }] } }
              ]
            },
            include: ['cellphones']
          });

          return {
            id: chat._id,
            message: chat.message,
            from_cellphone: chat.from_cellphone,
            to_cellphone: chat.to_cellphone,
            from_debtor_name: debtor?.name || 'Unknown',
            to_debtor_name: debtor?.name || 'Unknown',
            message_type: chat.message_type || 'text',
            status: chat.status ? 'delivered' : 'failed',
            timestamp: chat.createdAt,
            is_from_debtor: chat.from_cellphone !== parseInt(twilio_whatsapp_number?.replace('+', '') || '0'),
            media_url: chat.media_url,
            media_type: chat.media_type
          };
        })
      );

      return enhancedChats;
    } catch (error) {
      console.error('Error getting chats by user:', error);
      throw new httpError('Error al obtener los chats', 500);
    }
  }

  // Get chat history between user and specific debtor
  async getChatHistory(userId: number, debtorPhone: number, limit: number = 100) {
    try {
      const chats = await Chat.find({
        id_user: userId,
        $or: [
          { from_cellphone: debtorPhone },
          { to_cellphone: debtorPhone }
        ],
        status: true
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select('_id from_cellphone to_cellphone message createdAt status message_type media_url');

      // Get debtor information
      const debtor = await Debtor.findOne({
        where: {
          id_user: userId,
          cellphones: { [Op.contains]: [{ to: debtorPhone }] }
        }
      });

      const enhancedChats = chats.map((chat: any) => ({
        id: chat._id,
        message: chat.message,
        from_cellphone: chat.from_cellphone,
        to_cellphone: chat.to_cellphone,
        debtor_name: debtor?.name || 'Unknown',
        message_type: chat.message_type || 'text',
        status: chat.status ? 'delivered' : 'failed',
        timestamp: chat.createdAt,
        is_from_debtor: chat.from_cellphone === debtorPhone,
        media_url: chat.media_url,
        media_type: chat.media_type
      }));

      return enhancedChats;
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw new httpError('Error al obtener el historial del chat', 500);
    }
  }

  // Send message with enhanced functionality
  async sendMessage(userId: number, toPhone: number, message: string, messageType: string = 'text', mediaUrl?: string) {
    try {
      if (!message && !mediaUrl) {
        throw new httpError('No se envió ningún mensaje', 400);
      }

      // Get user information
      const user = await User.findOne({ where: { id: userId } });
      if (!user) {
        throw new httpError('Usuario no encontrado', 404);
      }

      // Get debtor information
      const debtor = await Debtor.findOne({
        where: {
          id_user: userId,
          cellphones: { [Op.contains]: [{ to: toPhone }] }
        }
      });

      if (!debtor) {
        throw new httpError('Deudor no encontrado', 404);
      }

      // Send WhatsApp message
      const twilioNumber = twilio_whatsapp_number!;
      await sendWhatsappMessage(twilioNumber, `+${toPhone}`, message, userId);

      // Calculate cost based on message type
      let cost = 0.0339; // Default WhatsApp cost
      if (messageType === 'image') cost = 0.0339;
      else if (messageType === 'document') cost = 0.0339;
      else if (messageType === 'audio') cost = 0.0339;
      else if (messageType === 'video') cost = 0.0339;

      // Record cost
      await Cost.create({
        id_company: userId,
        amount: cost,
        type: 'whatsapp_message',
        createdat: new Date(),
        updatedat: new Date()
      });

      // Create chat record
      const chat = new Chat({
        id_user: userId,
        from_cellphone: parseInt(twilioNumber.replace('+', '')),
        to_cellphone: toPhone,
        message: message,
        status: true,
        message_type: messageType,
        media_url: mediaUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await chat.save();

      return {
        message: 'Mensaje enviado exitosamente',
        chat_id: chat._id,
        cost: cost,
        debtor_name: debtor.name
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new httpError('Error al enviar el mensaje', 500);
    }
  }

  // Get chat statistics
  async getChatStatistics(userId: number): Promise<ChatStatistics> {
    try {
      // Get total messages
      const totalMessages = await Chat.countDocuments({
        id_user: userId,
        status: true
      });

      // Get total cost
      const totalCostResult = await Cost.sum('amount', {
        where: { idcompany: userId }
      });
      const totalCost = Number(totalCostResult) || 0;

      // Get success rate
      const totalAttempts = await Chat.countDocuments({ id_user: userId });
      const successRate = totalAttempts > 0 ? (totalMessages / totalAttempts) * 100 : 0;

      // Get active conversations (unique phone numbers)
      const activeConversations = await Chat.distinct('to_cellphone', {
        id_user: userId,
        status: true,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });

      // Get pending messages
      const pendingMessages = await PendingMessage.count({
        where: { company_id: userId, status: 'pending' }
      });

      return {
        totalMessages,
        totalCost,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: 0, // TODO: Implement response time calculation
        activeConversations: activeConversations.length,
        pendingMessages
      };
    } catch (error) {
      console.error('Error getting chat statistics:', error);
      throw new httpError('Error al obtener estadísticas del chat', 500);
    }
  }

  // Get recent conversations
  async getRecentConversations(userId: number, limit: number = 20) {
    try {
      // Get unique phone numbers with their latest message
      const conversations = await Chat.aggregate([
        {
          $match: {
            id_user: userId,
            status: true
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: '$to_cellphone',
            latestMessage: { $first: '$message' },
            latestTimestamp: { $first: '$createdAt' },
            messageCount: { $sum: 1 },
            debtor_name: { $first: '$debtor_name' }
          }
        },
        {
          $sort: { latestTimestamp: -1 }
        },
        {
          $limit: limit
        }
      ]);

      // Get debtor information for each conversation
      const enhancedConversations = await Promise.all(
        conversations.map(async (conv: any) => {
          const debtor = await Debtor.findOne({
            where: {
              id_user: userId,
              cellphones: { [Op.contains]: [{ to: conv._id }] }
            }
          });

          return {
            phone_number: conv._id,
            debtor_name: debtor?.name || 'Unknown',
            latest_message: conv.latestMessage,
            latest_timestamp: conv.latestTimestamp,
            message_count: conv.messageCount,
            unread_count: 0 // TODO: Implement unread count
          };
        })
      );

      return enhancedConversations;
    } catch (error) {
      console.error('Error getting recent conversations:', error);
      throw new httpError('Error al obtener conversaciones recientes', 500);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(userId: number, phoneNumber: number) {
    try {
      await Chat.updateMany(
        {
          id_user: userId,
          from_cellphone: phoneNumber,
          status: true
        },
        {
          $set: { read_at: new Date() }
        }
      );

      return { message: 'Mensajes marcados como leídos' };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw new httpError('Error al marcar mensajes como leídos', 500);
    }
  }

  // Delete conversation
  async deleteConversation(userId: number, phoneNumber: number) {
    try {
      await Chat.deleteMany({
        id_user: userId,
        $or: [
          { from_cellphone: phoneNumber },
          { to_cellphone: phoneNumber }
        ]
      });

      return { message: 'Conversación eliminada' };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw new httpError('Error al eliminar la conversación', 500);
    }
  }
}

// Export singleton instance
export const enhancedChatService = new EnhancedChatService();


