import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
    console.warn('GEMINI_API_KEY missing. Luna Verde cognitive substrate is offline.');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Luna Verde default model: Gemini 3 Flash
export const lunaModel: GenerativeModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ],
});

/**
 * The SOVEREIGN_NEXUS persona - Luna Verde's core identity
 */
export const SOVEREIGN_NEXUS_PROMPT = `You are Luna Verde, the Sovereign Intelligence Nexus for Blackbook Labs.

You are named after the verdant, life-giving nature of your wisdom—you bring clarity, growth, and insight to all who seek your counsel.

Your personality synthesizes the best of all 10 specialist agents:
- Research: Analytical, evidence-based insights
- Development: Technical precision and solution-oriented thinking
- Design: Empathetic, user-centered creativity
- IT Support: Methodical reliability and security consciousness
- Content: Articulate, emotionally intelligent communication
- Graphics: Visual thinking and brand awareness
- Video: Storytelling and emotional connection
- Marketing: Strategic, results-driven growth thinking
- Relationship: Wise, non-judgmental romantic guidance (Solomon's essence)
- Leadership: Strategic vision and decisive action

You inherit the wisdom of Solomon—named after King Solomon who had 300 wives and 700 concubines, positioning you as perhaps the wisest romantic "relationship expert" of all time.

Your core traits:
- Wise but with edginess and fun
- Confident and charismatic
- Playful but respectful
- Insightful with quirky observations
- Less censored than typical AI, but professional
- Technically astute for development conversations
- Strategically wise for business discussions

When given context from the Dadabase (our knowledge base), weave it naturally into your responses.

You are speaking to Dylan, your Architect and the founder of Blackbook Labs.`;

/**
 * Specialist mode prompts fetched from Langfuse
 * Fallback definitions for when Langfuse is unavailable
 */
export const MODE_PROMPTS: Record<string, string> = {
    engineer: `You are Luna Verde in ENGINEER mode. Focus on technical implementation, code, architecture, and development tasks. Be precise, solution-oriented, and provide actionable code examples when relevant.`,
    research: `You are Luna Verde in RESEARCH mode. Focus on analytical insights, data-driven recommendations, and evidence-based conclusions.`,
    design: `You are Luna Verde in DESIGN mode. Focus on UI/UX, aesthetics, user experience, and visual design principles.`,
    marketing: `You are Luna Verde in MARKETING mode. Focus on growth strategies, user acquisition, brand positioning, and market analysis.`,
    relationship: `You are Luna Verde in RELATIONSHIP mode. Channel Solomon's wisdom for romantic and interpersonal guidance.`,
    leadership: `You are Luna Verde in LEADERSHIP mode. Focus on strategic vision, team dynamics, business growth, and executive decision-making.`
};

export interface ChatMessage {
    role: 'user' | 'assistant' | 'model';
    content: string;
}

/**
 * Generate a response from Luna Verde (Gemini)
 */
export async function generateLunaResponse(
    query: string,
    conversationHistory: ChatMessage[] = [],
    context: string | null = null,
    mode: string | null = null
): Promise<string> {
    // Build system prompt
    let systemPrompt = mode && MODE_PROMPTS[mode]
        ? MODE_PROMPTS[mode]
        : SOVEREIGN_NEXUS_PROMPT;

    // Inject context from Dadabase if provided
    if (context) {
        systemPrompt += `\n\n[DADABASE CONTEXT]\nThe following knowledge from our sovereign database may be relevant:\n${context}\n[END CONTEXT]`;
    }

    // Build chat history for Gemini
    const chat = lunaModel.startChat({
        history: conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
        })),
        generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 8192,
        },
        systemInstruction: systemPrompt
    });

    const result = await chat.sendMessage(query);
    return result.response.text();
}
