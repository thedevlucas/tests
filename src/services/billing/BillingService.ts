// Billing Service - Senior Full Stack Developer Implementation
import { Cost } from '../../models/Cost';
import { Debtor } from '../../models/Debtor';
import { Chat } from '../../models/Chat';
import { PendingMessage } from '../../models/PendingMessage';
import { User } from '../../models/User';
import { Op, Sequelize } from 'sequelize';

export interface CostRecord {
  id: number;
  cost_type: 'message' | 'call' | 'sms' | 'email' | 'subscription' | 'bot_rental';
  amount: number;
  description: string;
  phone_number?: number;
  created_at: string;
  status: 'pending' | 'processed' | 'failed';
  currency: string;
}

export interface BillingSummary {
  total_cost: number;
  monthly_cost: number;
  daily_cost: number;
  cost_by_type: {
    messages: number;
    calls: number;
    sms: number;
    emails: number;
    subscription: number;
    bot_rental: number;
  };
  usage_stats: {
    total_messages: number;
    total_calls: number;
    total_sms: number;
    total_emails: number;
  };
  billing_period: {
    start_date: string;
    end_date: string;
    days_remaining: number;
  };
}

export interface SubscriptionInfo {
  plan_name: string;
  monthly_fee: number;
  included_credits: number;
  used_credits: number;
  remaining_credits: number;
  next_billing_date: string;
  auto_renewal: boolean;
}

export interface PaymentResult {
  success: boolean;
  transaction_id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  message: string;
}

export interface PaymentRecord {
  id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed';
  transaction_id: string;
  created_at: string;
  description: string;
}

export interface UsageAnalytics {
  daily_usage: Array<{
    date: string;
    messages: number;
    calls: number;
    sms: number;
    emails: number;
    cost: number;
  }>;
  cost_trends: {
    period: string;
    total_cost: number;
    cost_per_message: number;
    cost_per_call: number;
  }[];
  usage_forecast: {
    next_month_messages: number;
    next_month_calls: number;
    estimated_cost: number;
  };
}

export class BillingService {
  // Get cost records for a user
  static async getCostRecords(userId: number, periodDays: number): Promise<CostRecord[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      const costs = await Cost.findAll({
        where: {
          id_user: userId,
          created_at: {
            [Op.gte]: startDate
          }
        },
        order: [['created_at', 'DESC']]
      });

      return costs.map((cost: any) => ({
        id: cost.id,
        cost_type: cost.cost_type as any,
        amount: cost.amount,
        description: cost.description,
        phone_number: cost.phone_number,
        created_at: cost.created_at.toISOString(),
        status: cost.status as any,
        currency: 'USD'
      }));
    } catch (error) {
      console.error('Error getting cost records:', error);
      throw error;
    }
  }

  // Get billing summary
  static async getBillingSummary(userId: number): Promise<BillingSummary> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get total cost
      const totalCost = await Cost.sum('amount', {
        where: { id_user: userId }
      }) || 0;

      // Get monthly cost
      const monthlyCost = await Cost.sum('amount', {
        where: {
          id_user: userId,
          created_at: { [Op.gte]: startOfMonth }
        }
      }) || 0;

      // Get daily cost
      const dailyCost = await Cost.sum('amount', {
        where: {
          id_user: userId,
          created_at: { [Op.gte]: startOfDay }
        }
      }) || 0;

      // Get cost by type
      const costByType = await this.getCostByType(userId);

      // Get usage stats
      const usageStats = await this.getUsageStats(userId);

      // Calculate billing period
      const billingPeriod = this.calculateBillingPeriod();

      return {
        total_cost: totalCost,
        monthly_cost: monthlyCost,
        daily_cost: dailyCost,
        cost_by_type: costByType,
        usage_stats: usageStats,
        billing_period: billingPeriod
      };
    } catch (error) {
      console.error('Error getting billing summary:', error);
      throw error;
    }
  }

  // Get subscription information
  static async getSubscriptionInfo(userId: number): Promise<SubscriptionInfo> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // In production, this would come from a subscriptions table
      const subscription: SubscriptionInfo = {
        plan_name: 'Professional Plan',
        monthly_fee: 99.99,
        included_credits: 1000,
        used_credits: await this.getUsedCredits(userId),
        remaining_credits: 0, // Will be calculated
        next_billing_date: this.getNextBillingDate(),
        auto_renewal: true
      };

      subscription.remaining_credits = subscription.included_credits - subscription.used_credits;

      return subscription;
    } catch (error) {
      console.error('Error getting subscription info:', error);
      throw error;
    }
  }

  // Process payment
  static async processPayment(params: {
    userId: number;
    amount: number;
    paymentMethod: string;
  }): Promise<PaymentResult> {
    try {
      const { userId, amount, paymentMethod } = params;

      // In production, this would integrate with a payment gateway like Stripe
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create cost record for the payment
      await Cost.create({
        id_user: userId,
        id_debtor: null,
        cost_type: 'subscription',
        amount: amount,
        description: `Payment processed via ${paymentMethod}`,
        phone_number: null
      });

      return {
        success: true,
        transaction_id: transactionId,
        amount: amount,
        currency: 'USD',
        status: 'completed',
        message: 'Payment processed successfully'
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Generate invoice
  static async generateInvoice(costId: number, userId: number): Promise<Buffer> {
    try {
      const cost = await Cost.findOne({
        where: { id: costId, id_user: userId }
      });

      if (!cost) {
        throw new Error('Cost record not found');
      }

      // In production, this would generate a PDF invoice
      // For now, return a mock PDF buffer
      const invoiceData = {
        invoice_id: `INV-${costId}`,
        date: cost.created_at.toISOString(),
        amount: cost.amount,
        description: cost.description,
        user_id: userId
      };

      // Mock PDF generation - in production, use a library like PDFKit
      const mockPdfBuffer = Buffer.from(JSON.stringify(invoiceData));

      return mockPdfBuffer;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  // Update subscription
  static async updateSubscription(userId: number, subscriptionData: {
    plan_name: string;
    auto_renewal: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // In production, this would update a subscriptions table
      return {
        success: true,
        message: `Subscription updated to ${subscriptionData.plan_name}`
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Get payment history
  static async getPaymentHistory(userId: number): Promise<PaymentRecord[]> {
    try {
      const payments = await Cost.findAll({
        where: {
          id_user: userId,
          cost_type: 'subscription'
        },
        order: [['created_at', 'DESC']]
      });

      return payments.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        currency: 'USD',
        payment_method: 'card',
        status: 'completed',
        transaction_id: `txn_${payment.id}`,
        created_at: payment.created_at.toISOString(),
        description: payment.description
      }));
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Get usage analytics
  static async getUsageAnalytics(userId: number): Promise<UsageAnalytics> {
    try {
      const dailyUsage = await this.getDailyUsage(userId);
      const costTrends = await this.getCostTrends(userId);
      const usageForecast = await this.getUsageForecast(userId);

      return {
        daily_usage: dailyUsage,
        cost_trends: costTrends,
        usage_forecast: usageForecast
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private static async getCostByType(userId: number): Promise<{
    messages: number;
    calls: number;
    sms: number;
    emails: number;
    subscription: number;
    bot_rental: number;
  }> {
    const costTypes = ['message', 'call', 'sms', 'email', 'subscription', 'bot_rental'];
    const costByType: any = {};

    for (const type of costTypes) {
      const sum = await Cost.sum('amount', {
        where: {
          id_user: userId,
          cost_type: type
        }
      });
      costByType[type] = sum || 0;
    }

    return costByType;
  }

  private static async getUsageStats(userId: number): Promise<{
    total_messages: number;
    total_calls: number;
    total_sms: number;
    total_emails: number;
  }> {
    const messageCount = await Chat.count({
      where: { from_cellphone: { [Op.ne]: 0 } }
    });

    const smsCount = await PendingMessage.count({
      where: { type: 'sms' }
    });

    const emailCount = await PendingMessage.count({
      where: { type: 'email' }
    });

    // Mock call count - in production, this would come from a calls table
    const callCount = Math.floor(messageCount * 0.1);

    return {
      total_messages: messageCount,
      total_calls: callCount,
      total_sms: smsCount,
      total_emails: emailCount
    };
  }

  private static calculateBillingPeriod(): {
    start_date: string;
    end_date: string;
    days_remaining: number;
  } {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const daysRemaining = endOfMonth.getDate() - now.getDate();

    return {
      start_date: startOfMonth.toISOString(),
      end_date: endOfMonth.toISOString(),
      days_remaining: daysRemaining
    };
  }

  private static async getUsedCredits(userId: number): Promise<number> {
    const messageCount = await Chat.count({
      where: { from_cellphone: { [Op.ne]: 0 } }
    });

    const smsCount = await PendingMessage.count({
      where: { type: 'sms' }
    });

    const emailCount = await PendingMessage.count({
      where: { type: 'email' }
    });

    // Each message costs 1 credit, SMS costs 2 credits, email costs 1 credit
    return messageCount + (smsCount * 2) + emailCount;
  }

  private static getNextBillingDate(): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  private static async getDailyUsage(userId: number): Promise<Array<{
    date: string;
    messages: number;
    calls: number;
    sms: number;
    emails: number;
    cost: number;
  }>> {
    // Mock daily usage data - in production, this would query actual usage
    const dailyUsage = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      dailyUsage.push({
        date: date.toISOString().split('T')[0],
        messages: Math.floor(Math.random() * 50) + 10,
        calls: Math.floor(Math.random() * 10) + 2,
        sms: Math.floor(Math.random() * 20) + 5,
        emails: Math.floor(Math.random() * 15) + 3,
        cost: Math.floor(Math.random() * 50) + 10
      });
    }

    return dailyUsage;
  }

  private static async getCostTrends(userId: number): Promise<Array<{
    period: string;
    total_cost: number;
    cost_per_message: number;
    cost_per_call: number;
  }>> {
    // Mock cost trends data
    return [
      {
        period: 'Week 1',
        total_cost: 150.50,
        cost_per_message: 0.05,
        cost_per_call: 2.50
      },
      {
        period: 'Week 2',
        total_cost: 180.75,
        cost_per_message: 0.06,
        cost_per_call: 2.75
      },
      {
        period: 'Week 3',
        total_cost: 220.30,
        cost_per_message: 0.07,
        cost_per_call: 3.00
      }
    ];
  }

  private static async getUsageForecast(userId: number): Promise<{
    next_month_messages: number;
    next_month_calls: number;
    estimated_cost: number;
  }> {
    // Mock forecast data
    return {
      next_month_messages: 1200,
      next_month_calls: 150,
      estimated_cost: 350.00
    };
  }
}

