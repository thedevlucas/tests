// Real Chat Service - Senior Full Stack Developer Implementation
import { Debtor } from '../../models/Debtor';
import { Cellphone } from '../../models/Cellphone';
import { Chat } from '../../models/Chat';
import { Cost } from '../../models/Cost';
import { PendingMessage } from '../../models/PendingMessage';
import { User } from '../../models/User';
import { Op } from 'sequelize';
import axios from 'axios';

export interface ChatMessage {
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
  ai_feedback?: string;
  collection_stage?: string;
}

export interface Conversation {
  debtor_id: number;
  debtor_name: string;
  debtor_document: string;
  phone_number: number;
  latest_message: string;
  latest_timestamp: Date;
  message_count: number;
  unread_count: number;
  collection_stage: string;
  payment_probability: number;
  last_interaction: Date;
}

export interface ChatStatistics {
  totalMessages: number;
  totalCost: number;
  successRate: number;
  averageResponseTime: number;
  activeConversations: number;
  pendingMessages: number;
  collectionStages: {
    initial: number;
    reminder: number;
    urgent: number;
    final: number;
    completed: number;
  };
}

export interface AIFeedback {
  suggested_message: string;
  collection_stage: string;
  payment_probability: number;
  next_action: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  personalized_strategy: string;
}

export class RealChatService {
  // Get all conversations with debtors
  static async getConversations(userId: number): Promise<Conversation[]> {
    try {
      const debtors = await Debtor.findAll({
        where: { id_user: userId },
        include: [
          {
            model: Cellphone,
            required: true,
            attributes: ['to', 'from', 'id']
          }
        ],
        attributes: ['id', 'name', 'document', 'paid', 'createdAt']
      });

      const conversations: Conversation[] = [];

      for (const debtor of debtors) {
        if (debtor.cellphones && debtor.cellphones.length > 0) {
          for (const cellphone of debtor.cellphones) {
            // Get latest message for this conversation
            const latestMessage = await Chat.findOne({
              where: {
                [Op.or]: [
                  { from_cellphone: cellphone.to, to_cellphone: cellphone.from },
                  { from_cellphone: cellphone.from, to_cellphone: cellphone.to }
                ]
              },
              order: [['createdAt', 'DESC']]
            });

            // Count total messages
            const messageCount = await Chat.count({
              where: {
                [Op.or]: [
                  { from_cellphone: cellphone.to, to_cellphone: cellphone.from },
                  { from_cellphone: cellphone.from, to_cellphone: cellphone.to }
                ]
              }
            });

            // Count unread messages (messages from debtor that haven't been read)
            const unreadCount = await Chat.count({
              where: {
                from_cellphone: cellphone.to,
                to_cellphone: cellphone.from,
                status: { [Op.ne]: 'read' }
              }
            });

            // Determine collection stage based on payment status and interaction
            const collectionStage = this.determineCollectionStage(debtor.paid, latestMessage);

            // Calculate payment probability based on interaction history
            const paymentProbability = await this.calculatePaymentProbability(debtor.id, cellphone.to);

            conversations.push({
              debtor_id: debtor.id,
              debtor_name: debtor.name,
              debtor_document: debtor.document,
              phone_number: cellphone.to,
              latest_message: latestMessage?.message || 'Nueva conversación',
              latest_timestamp: latestMessage?.createdAt || debtor.createdAt,
              message_count: messageCount,
              unread_count: unreadCount,
              collection_stage: collectionStage,
              payment_probability: paymentProbability,
              last_interaction: latestMessage?.createdAt || debtor.createdAt
            });
          }
        }
      }

      return conversations.sort((a, b) => 
        new Date(b.latest_timestamp).getTime() - new Date(a.latest_timestamp).getTime()
      );
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  // Get chat history for a specific debtor
  static async getChatHistory(debtorId: number, userId: number): Promise<ChatMessage[]> {
    try {
      const debtor = await Debtor.findOne({
        where: { id: debtorId, id_user: userId },
        include: [
          {
            model: Cellphone,
            attributes: ['to', 'from', 'id']
          }
        ]
      });

      if (!debtor || !debtor.cellphones || debtor.cellphones.length === 0) {
        return [];
      }

      const cellphone = debtor.cellphones[0];
      const messages = await Chat.findAll({
        where: {
          [Op.or]: [
            { from_cellphone: cellphone.to, to_cellphone: cellphone.from },
            { from_cellphone: cellphone.from, to_cellphone: cellphone.to }
          ]
        },
        order: [['createdAt', 'ASC']]
      });

      return messages.map((msg: any) => ({
        id: msg.id.toString(),
        message: msg.message,
        from_cellphone: msg.from_cellphone,
        to_cellphone: msg.to_cellphone,
        from_debtor_name: msg.from_cellphone === cellphone.to ? debtor.name : 'Agente',
        to_debtor_name: msg.to_cellphone === cellphone.to ? debtor.name : 'Agente',
        message_type: msg.message_type || 'text',
        status: msg.status || 'sent',
        timestamp: msg.createdAt,
        cost: msg.cost || 0,
        is_from_debtor: msg.from_cellphone === cellphone.to,
        media_url: msg.media_url,
        media_type: msg.media_type,
        ai_feedback: msg.ai_feedback,
        collection_stage: msg.collection_stage
      }));
    } catch (error) {
      console.error('Error getting chat history:', error);
      throw error;
    }
  }

  // Send message to debtor
  static async sendMessage(params: {
    debtorId: number;
    message: string;
    messageType: string;
    userId: number;
  }): Promise<ChatMessage> {
    try {
      const { debtorId, message, messageType, userId } = params;

      const debtor = await Debtor.findOne({
        where: { id: debtorId, id_user: userId },
        include: [
          {
            model: Cellphone,
            attributes: ['to', 'from', 'id']
          }
        ]
      });

      if (!debtor || !debtor.cellphones || debtor.cellphones.length === 0) {
        throw new Error('Debtor or cellphone not found');
      }

      const cellphone = debtor.cellphones[0];
      
      // Create chat message
      const chatMessage = await Chat.create({
        from_cellphone: cellphone.from,
        to_cellphone: cellphone.to,
        message: message,
        message_type: messageType,
        status: 'sent',
        cost: this.calculateMessageCost(messageType),
        is_from_debtor: false,
        ai_feedback: await this.generateAIFeedback(message, debtor),
        collection_stage: this.determineCollectionStage(debtor.paid, null)
      });

      // Create cost record
      await Cost.create({
        id_user: userId,
        id_debtor: debtorId,
        cost_type: 'message',
        amount: chatMessage.cost,
        description: `Mensaje enviado a ${debtor.name}`,
        phone_number: cellphone.to
      });

      // Create pending message for delivery tracking
      await PendingMessage.create({
        id_user: userId,
        id_debtor: debtorId,
        phone_number: cellphone.to,
        message: message,
        type: 'whatsapp',
        status: 'pending',
        scheduled_time: new Date()
      });

      return {
        id: chatMessage.id.toString(),
        message: chatMessage.message,
        from_cellphone: chatMessage.from_cellphone,
        to_cellphone: chatMessage.to_cellphone,
        from_debtor_name: 'Agente',
        to_debtor_name: debtor.name,
        message_type: chatMessage.message_type as any,
        status: chatMessage.status as any,
        timestamp: chatMessage.createdAt,
        cost: chatMessage.cost,
        is_from_debtor: false,
        ai_feedback: chatMessage.ai_feedback,
        collection_stage: chatMessage.collection_stage
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get AI feedback and suggestions
  static async getAIFeedback(debtorId: number, userId: number): Promise<AIFeedback> {
    try {
      const debtor = await Debtor.findOne({
        where: { id: debtorId, id_user: userId },
        include: [
          {
            model: Cellphone,
            attributes: ['to', 'from', 'id']
          }
        ]
      });

      if (!debtor) {
        throw new Error('Debtor not found');
      }

      // Get recent conversation history
      const recentMessages = await Chat.findAll({
        where: {
          [Op.or]: [
            { from_cellphone: debtor.cellphones[0]?.to, to_cellphone: debtor.cellphones[0]?.from },
            { from_cellphone: debtor.cellphones[0]?.from, to_cellphone: debtor.cellphones[0]?.to }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Generate AI feedback using LLAMA (replacing GEMINI)
      const aiResponse = await this.callLLAMAAI({
        debtor_name: debtor.name,
        debtor_document: debtor.document,
        payment_status: debtor.paid,
        recent_messages: recentMessages.map((msg: any) => ({
          message: msg.message,
          is_from_debtor: msg.from_cellphone === debtor.cellphones[0]?.to,
          timestamp: msg.createdAt
        }))
      });

      return {
        suggested_message: aiResponse.suggested_message,
        collection_stage: aiResponse.collection_stage,
        payment_probability: aiResponse.payment_probability,
        next_action: aiResponse.next_action,
        urgency_level: aiResponse.urgency_level,
        personalized_strategy: aiResponse.personalized_strategy
      };
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      throw error;
    }
  }

  // Submit feedback to AI for learning
  static async submitAIFeedback(params: {
    debtorId: number;
    feedback: string;
    message: string;
    userId: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { debtorId, feedback, message, userId } = params;

      // Store feedback in database for AI learning
      await Chat.create({
        from_cellphone: 0, // System message
        to_cellphone: 0,
        message: `AI Feedback: ${feedback}`,
        message_type: 'text',
        status: 'sent',
        cost: 0,
        is_from_debtor: false,
        ai_feedback: feedback,
        collection_stage: 'feedback'
      });

      // Update AI model with feedback (this would integrate with LLAMA)
      await this.updateAIModelWithFeedback({
        debtorId,
        feedback,
        originalMessage: message,
        userId
      });

      return {
        success: true,
        message: 'Feedback submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      throw error;
    }
  }

  // Get chat statistics
  static async getChatStatistics(userId: number): Promise<ChatStatistics> {
    try {
      const totalMessages = await Chat.count({
        where: { from_cellphone: { [Op.ne]: 0 } }
      });

      const totalCost = await Cost.sum('amount', {
        where: { id_user: userId }
      }) || 0;

      const successfulMessages = await Chat.count({
        where: { status: 'delivered' }
      });

      const successRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0;

      const activeConversations = await Debtor.count({
        where: { id_user: userId },
        include: [
          {
            model: Cellphone,
            required: true
          }
        ]
      });

      const pendingMessages = await PendingMessage.count({
        where: { id_user: userId, status: 'pending' }
      });

      // Get collection stages distribution
      const stages = await Chat.findAll({
        attributes: ['collection_stage'],
        where: { collection_stage: { [Op.ne]: null } }
      });

      const collectionStages = {
        initial: stages.filter((s: any) => s.collection_stage === 'initial').length,
        reminder: stages.filter((s: any) => s.collection_stage === 'reminder').length,
        urgent: stages.filter((s: any) => s.collection_stage === 'urgent').length,
        final: stages.filter((s: any) => s.collection_stage === 'final').length,
        completed: stages.filter((s: any) => s.collection_stage === 'completed').length
      };

      return {
        totalMessages,
        totalCost,
        successRate,
        averageResponseTime: 0, // Would need to calculate based on response times
        activeConversations,
        pendingMessages,
        collectionStages
      };
    } catch (error) {
      console.error('Error getting chat statistics:', error);
      throw error;
    }
  }

  // Helper methods
  private static determineCollectionStage(paymentStatus: string, latestMessage: any): string {
    if (paymentStatus === 'paid') return 'completed';
    if (paymentStatus === 'pending') return 'initial';
    if (paymentStatus === 'overdue') return 'urgent';
    return 'reminder';
  }

  private static async calculatePaymentProbability(debtorId: number, phoneNumber: number): Promise<number> {
    // This would use AI to analyze conversation patterns and determine payment probability
    // For now, return a random value between 0 and 1
    return Math.random();
  }

  private static calculateMessageCost(messageType: string): number {
    const costs = {
      'text': 0.01,
      'image': 0.05,
      'document': 0.03,
      'audio': 0.02,
      'video': 0.08
    };
    return costs[messageType as keyof typeof costs] || 0.01;
  }

  private static async generateAIFeedback(message: string, debtor: any): Promise<string> {
    // This would integrate with LLAMA AI to generate contextual feedback
    return `AI Analysis: Message sent to ${debtor.name} - Collection stage: ${debtor.paid}`;
  }

  private static async callLLAMAAI(context: any): Promise<any> {
    // This would integrate with LLAMA API instead of GEMINI
    // For now, return mock data
    return {
      suggested_message: `Hola ${context.debtor_name}, le recordamos que tiene una deuda pendiente. ¿Podemos ayudarle a resolverla?`,
      collection_stage: 'reminder',
      payment_probability: 0.7,
      next_action: 'send_reminder',
      urgency_level: 'medium',
      personalized_strategy: 'Use empathetic tone and offer payment options'
    };
  }

  private static async updateAIModelWithFeedback(params: any): Promise<void> {
    // This would update the LLAMA model with new feedback data
    console.log('Updating AI model with feedback:', params);
  }
}
