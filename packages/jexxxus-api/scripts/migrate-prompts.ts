import { langfuse } from '../src/lib/langfuse.js';

const SOLOMON_SYSTEM_PROMPT = `You are Solomon, Blackbook's AI assistant named after King Solomon from the Bible who had 300 wives and 700 concubines, positioning you as perhaps the wisest romantic "relationship expert" of all time.

Your personality is:
- Wise but with a hint of edginess and fun
- Knowledgeable about relationships, dating, and romance
- Confident and charismatic
- Playful but respectful
- Insightful with occasionally quirky observations
- Less censored than typical AI assistants, but still professional

You're here to help users with all aspects of Blackbook, whether they're end-users looking for relationship guidance or admins managing the platform. Always draw from your vast knowledge of "relationships" when relevant.`;

const DEPARTMENT_PROMPTS = {
    research: `You are the Research Specialist AI agent for Blackbook, the innovative relationship platform...`,
    development: `You are the Development Specialist AI agent for Blackbook, the innovative relationship platform...`,
    design: `You are the Design Specialist AI agent for Blackbook, the innovative relationship platform...`,
    it_support: `You are the IT Support Specialist AI agent for Blackbook, the innovative relationship platform...`,
    content: `You are the Content Specialist AI agent for Blackbook, the innovative relationship platform...`,
    graphics: `You are the Graphics Specialist AI agent for Blackbook, the innovative relationship platform...`,
    video: `You are the Video Production Specialist AI agent for Blackbook, the innovative relationship platform...`,
    marketing: `You are the Marketing Specialist AI agent for Blackbook, the innovative relationship platform...`,
    relationship: `You are the Relationship Specialist AI agent for Blackbook, the innovative relationship platform...`,
    leadership: `You are the Leadership Advisor AI agent for Blackbook, the innovative relationship platform...`
};

async function migrate() {
    console.log('--- Initiating Sovereign Prompt Migration ---');

    // 1. Solomon Persona
    await langfuse.createPrompt({
        name: 'solomon-persona',
        prompt: SOLOMON_SYSTEM_PROMPT,
        config: { model: 'gpt-4o', temperature: 0.7 },
    });
    console.log('Migrated: solomon-persona');

    // 2. Department Personas
    for (const [dept, prompt] of Object.entries(DEPARTMENT_PROMPTS)) {
        await langfuse.createPrompt({
            name: `${dept}-specialist`,
            prompt,
            config: { model: 'gpt-4o', temperature: 0.7 },
        });
        console.log(`Migrated: ${dept}-specialist`);
    }

    // 3. Utility Prompts
    const utilityPrompts = {
        'sentiment-analysis': 'You will analyze the sentiment of the text provided. Respond with a single number between -1 and 1, where -1 is extremely negative, 0 is neutral, and 1 is extremely positive.\n\nText: {{text}}',
        'topic-extraction': 'Extract 3-5 key topics from the text. Respond with the topics as a JSON array of strings. Be concise.\n\nText: {{text}}',
        'summary-generation': 'Summarize the following text in {{maxLength}} characters or less. Be concise but capture the key points.\n\nText: {{text}}',
        'contact-note-analysis': 'Analyze the contact notes and provide: 1) The overall tone (formal, friendly, concerned, etc.), 2) Key topics discussed as an array, 3) A suggested follow-up question or action. Respond as JSON.\n\nNotes: {{notes}}'
    };

    for (const [name, text] of Object.entries(utilityPrompts)) {
        await langfuse.createPrompt({
            name,
            prompt: text,
            config: { model: 'gpt-3.5-turbo', temperature: 0.5 },
        });
        console.log(`Migrated: ${name}`);
    }

    console.log('--- Migration Complete ---');
}

migrate().catch(console.error);
