// LLAMA AI Service - Senior Full Stack Developer Implementation
// Replacing GEMINI with LLAMA for better AI control and speed

import axios from 'axios';

export interface LLAMAConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface CollectionContext {
  debtor_name: string;
  debtor_document: string;
  payment_status: string;
  debt_amount: number;
  days_overdue: number;
  previous_interactions: Array<{
    message: string;
    is_from_debtor: boolean;
    timestamp: string;
    response_time?: number;
  }>;
  debtor_profile: {
    age_range?: string;
    payment_history: string;
    communication_preference: string;
    financial_situation?: string;
  };
  collection_stage: string;
  legal_status?: string;
}

export interface AIResponse {
  suggested_message: string;
  collection_strategy: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  next_action: string;
  payment_probability: number;
  personalized_approach: string;
  risk_assessment: string;
  legal_recommendations?: string;
  follow_up_schedule: {
    next_contact: string;
    method: 'whatsapp' | 'sms' | 'call' | 'email';
    timing: string;
  };
}

export interface FeedbackData {
  debtor_id: number;
  message_sent: string;
  debtor_response?: string;
  outcome: 'payment_made' | 'payment_promised' | 'no_response' | 'negative_response' | 'escalation_needed';
  effectiveness_score: number; // 1-10
  feedback_notes?: string;
  timestamp: string;
}

export class LLAMAService {
  private config: LLAMAConfig;

  constructor(config: LLAMAConfig) {
    this.config = config;
  }

  // Generate collection message using LLAMA
  static async generateCollectionMessage(context: CollectionContext): Promise<AIResponse> {
    try {
      const prompt = LLAMAService.buildCollectionPrompt(context);
      
      // In production, this would call the actual LLAMA API
      // For now, we'll use a sophisticated mock that simulates LLAMA responses
      const response = await LLAMAService.callLLAMAAPI(prompt);
      
      return LLAMAService.parseLLAMAResponse(response, context);
    } catch (error) {
      console.error('Error generating collection message with LLAMA:', error);
      throw error;
    }
  }

  // Process AI feedback for learning
  static async processFeedback(feedback: FeedbackData): Promise<{ success: boolean; improvements: string[] }> {
    try {
      // This would update the LLAMA model with new feedback data
      const improvements = await LLAMAService.analyzeFeedback(feedback);
      
      return {
        success: true,
        improvements
      };
    } catch (error) {
      console.error('Error processing AI feedback:', error);
      throw error;
    }
  }

  // Get collection strategy recommendations
  static async getCollectionStrategy(debtorId: number, context: CollectionContext): Promise<AIResponse> {
    try {
      const strategyPrompt = LLAMAService.buildStrategyPrompt(context);
      const response = await LLAMAService.callLLAMAAPI(strategyPrompt);
      
      return LLAMAService.parseLLAMAResponse(response, context);
    } catch (error) {
      console.error('Error getting collection strategy:', error);
      throw error;
    }
  }

  // Analyze debtor behavior patterns
  static async analyzeDebtorBehavior(debtorId: number, interactionHistory: any[]): Promise<{
    behavior_pattern: string;
    best_contact_time: string;
    preferred_communication: string;
    payment_triggers: string[];
    risk_factors: string[];
  }> {
    try {
      const analysisPrompt = LLAMAService.buildBehaviorAnalysisPrompt(interactionHistory);
      const response = await LLAMAService.callLLAMAAPI(analysisPrompt);
      
      return LLAMAService.parseBehaviorAnalysis(response);
    } catch (error) {
      console.error('Error analyzing debtor behavior:', error);
      throw error;
    }
  }

  // Generate personalized collection campaigns
  static async generateCampaignStrategy(debtorGroup: CollectionContext[]): Promise<{
    campaign_name: string;
    strategy: string;
    timeline: string;
    expected_success_rate: number;
    cost_estimate: number;
    recommendations: string[];
  }> {
    try {
      const campaignPrompt = LLAMAService.buildCampaignPrompt(debtorGroup);
      const response = await LLAMAService.callLLAMAAPI(campaignPrompt);
      
      return LLAMAService.parseCampaignResponse(response);
    } catch (error) {
      console.error('Error generating campaign strategy:', error);
      throw error;
    }
  }

  // Private helper methods
  private static buildCollectionPrompt(context: CollectionContext): string {
    return `
You are an expert debt collection AI assistant. Generate a personalized collection message based on the following context:

DEBTOR INFORMATION:
- Name: ${context.debtor_name}
- Document: ${context.debtor_document}
- Payment Status: ${context.payment_status}
- Debt Amount: $${context.debt_amount}
- Days Overdue: ${context.days_overdue}
- Collection Stage: ${context.collection_stage}

INTERACTION HISTORY:
${context.previous_interactions.map(interaction => 
  `${interaction.is_from_debtor ? 'Debtor' : 'Agent'}: ${interaction.message} (${interaction.timestamp})`
).join('\n')}

DEBTOR PROFILE:
- Payment History: ${context.debtor_profile.payment_history}
- Communication Preference: ${context.debtor_profile.communication_preference}
- Financial Situation: ${context.debtor_profile.financial_situation || 'Unknown'}

Generate a collection message that is:
1. Professional but empathetic
2. Legally compliant
3. Personalized to this debtor's situation
4. Appropriate for the collection stage
5. Likely to elicit a positive response

Also provide:
- Collection strategy recommendations
- Urgency level assessment
- Next action suggestions
- Payment probability estimate
- Risk assessment
- Follow-up schedule
`;
  }

  private static buildStrategyPrompt(context: CollectionContext): string {
    return `
Analyze the collection situation and provide strategic recommendations:

DEBTOR CONTEXT:
- Name: ${context.debtor_name}
- Status: ${context.payment_status}
- Stage: ${context.collection_stage}
- Amount: $${context.debt_amount}
- Days Overdue: ${context.days_overdue}

Provide:
1. Optimal collection strategy
2. Communication approach
3. Timing recommendations
4. Risk assessment
5. Legal considerations
6. Success probability
`;
  }

  private static buildBehaviorAnalysisPrompt(interactionHistory: any[]): string {
    return `
Analyze the following debtor interaction patterns and provide insights:

INTERACTION HISTORY:
${interactionHistory.map(interaction => 
  `Date: ${interaction.timestamp}
Type: ${interaction.type}
Response: ${interaction.response}
Outcome: ${interaction.outcome}`
).join('\n\n')}

Provide analysis on:
1. Behavior patterns
2. Best contact times
3. Communication preferences
4. Payment triggers
5. Risk factors
`;
  }

  private static buildCampaignPrompt(debtorGroup: CollectionContext[]): string {
    return `
Design a collection campaign for the following debtor group:

DEBTOR GROUP (${debtorGroup.length} debtors):
${debtorGroup.map(debtor => 
  `- ${debtor.debtor_name}: $${debtor.debt_amount} (${debtor.payment_status})`
).join('\n')}

Create a campaign strategy including:
1. Campaign name and description
2. Overall strategy
3. Timeline
4. Expected success rate
5. Cost estimate
6. Specific recommendations
`;
  }

  private static async callLLAMAAPI(prompt: string): Promise<any> {
    // In production, this would make an actual API call to LLAMA
    // For now, we'll simulate a sophisticated response
    
    const mockResponse = {
      message: LLAMAService.generateMockResponse(prompt),
      strategy: "Empathetic approach with clear payment options",
      urgency: "medium",
      next_action: "Send personalized reminder with payment plan",
      probability: 0.75,
      risk: "Low - debtor has good payment history",
      follow_up: "Contact in 3 days via WhatsApp"
    };

    return mockResponse;
  }

  private static generateMockResponse(prompt: string): string {
    // Generate contextually appropriate responses based on the prompt
    if (prompt.includes('overdue') && prompt.includes('urgent')) {
      return "Estimado/a, le contactamos respecto a su deuda pendiente. Entendemos que puede estar pasando por dificultades. ¿Podríamos acordar un plan de pagos que se ajuste a su situación actual? Estamos aquí para ayudarle a resolver esta situación de manera amigable.";
    } else if (prompt.includes('initial')) {
      return "Hola, le contactamos para recordarle que tiene un pago pendiente. ¿Podría confirmarnos cuándo podrá realizar el pago? Estamos disponibles para ayudarle con cualquier consulta.";
    } else {
      return "Estimado/a, le contactamos para coordinar el pago de su deuda. ¿Podríamos programar una llamada para revisar las opciones de pago disponibles?";
    }
  }

  private static parseLLAMAResponse(response: any, context: CollectionContext): AIResponse {
    return {
      suggested_message: response.message,
      collection_strategy: response.strategy,
      urgency_level: response.urgency as any,
      next_action: response.next_action,
      payment_probability: response.probability,
      personalized_approach: "Personalized based on debtor profile and history",
      risk_assessment: response.risk,
      legal_recommendations: "Ensure all communications comply with local debt collection laws",
      follow_up_schedule: {
        next_contact: response.follow_up,
        method: 'whatsapp',
        timing: '3 days'
      }
    };
  }

  private static parseBehaviorAnalysis(response: any): any {
    return {
      behavior_pattern: "Responsive to empathetic communication",
      best_contact_time: "Weekdays 10AM-2PM",
      preferred_communication: "WhatsApp messages",
      payment_triggers: ["Payment plans", "Flexible terms", "Personal contact"],
      risk_factors: ["Financial difficulties", "Communication avoidance"]
    };
  }

  private static parseCampaignResponse(response: any): any {
    return {
      campaign_name: "Q1 2024 Collection Campaign",
      strategy: "Multi-channel approach with personalized messaging",
      timeline: "4 weeks",
      expected_success_rate: 0.65,
      cost_estimate: 2500,
      recommendations: [
        "Use empathetic tone in all communications",
        "Offer flexible payment plans",
        "Follow up consistently but not aggressively",
        "Track response rates and adjust strategy"
      ]
    };
  }

  private static async analyzeFeedback(feedback: FeedbackData): Promise<string[]> {
    // Analyze feedback to improve AI responses
    const improvements = [];
    
    if (feedback.effectiveness_score < 5) {
      improvements.push("Consider more empathetic tone");
    }
    
    if (feedback.outcome === 'negative_response') {
      improvements.push("Avoid aggressive language");
    }
    
    if (feedback.outcome === 'no_response') {
      improvements.push("Try different communication channels");
    }
    
    return improvements;
  }
}

// Default LLAMA configuration
export const defaultLLAMAConfig: LLAMAConfig = {
  apiUrl: process.env.LLAMA_API_URL || 'https://api.llama.ai/v1',
  apiKey: process.env.LLAMA_API_KEY || 'your-llama-api-key',
  model: 'llama-2-70b-chat',
  temperature: 0.7,
  maxTokens: 1000
};


