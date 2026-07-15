/**
 * OnlyFinder Seed Script
 * Populates the models table with initial test assets
 * 
 * Run: npx tsx scripts/seed-models.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface SeedModel {
    of_username: string;
    display_name: string;
    fan_count: number;
    location: string;
    status: 'verified' | 'unverified';
    primary_image_url?: string;
    social_links?: Record<string, string>;
    luna_analysis?: string;
}

const SEED_MODELS: SeedModel[] = [
    {
        of_username: 'alyssa_divine',
        display_name: 'Alyssa Divine',
        fan_count: 45200,
        location: 'Los Angeles, CA',
        status: 'verified',
        social_links: { instagram: '@alyssadivine', twitter: '@alyssa_d' },
        luna_analysis: 'High engagement potential. Visual content focuses on lifestyle and fitness. Communication style: Confident, approachable. Recommended approach: Direct, professional collaboration offer.'
    },
    {
        of_username: 'jade_temptress',
        display_name: 'Jade Rose',
        fan_count: 28100,
        location: 'Miami, FL',
        status: 'verified',
        social_links: { instagram: '@jaderose_official' }
    },
    {
        of_username: 'chloe_mystique',
        display_name: 'Chloe M.',
        fan_count: 67500,
        location: 'New York, NY',
        status: 'verified',
        luna_analysis: 'Premium tier creator. Consistent posting schedule. Audience demographics: 70% male, 25-40 age range. Potential for exclusive content partnerships.'
    },
    {
        of_username: 'luna_goddess',
        display_name: 'Luna Goddess',
        fan_count: 112000,
        location: 'Las Vegas, NV',
        status: 'verified',
        social_links: { instagram: '@lunagoddess', twitter: '@luna_g', tiktok: '@lunagoddessofficial' },
        luna_analysis: 'Top 1% creator. Strong brand identity. Cross-platform presence suggests sophisticated marketing awareness. Approach with high-value, exclusive propositions only.'
    },
    {
        of_username: 'serena_bliss',
        display_name: 'Serena',
        fan_count: 15800,
        location: 'Dallas, TX',
        status: 'unverified'
    },
    {
        of_username: 'emma_starlight',
        display_name: 'Emma S.',
        fan_count: 33400,
        location: 'Chicago, IL',
        status: 'unverified',
        social_links: { instagram: '@emmastarlight' }
    },
    {
        of_username: 'violet_flame',
        display_name: 'Violet',
        fan_count: 89200,
        location: 'Phoenix, AZ',
        status: 'verified',
        luna_analysis: 'Rising creator with accelerating growth curve. Engagement rate above platform average. Responsive to DMs based on public interaction patterns.'
    },
    {
        of_username: 'ruby_dreams',
        display_name: 'Ruby D.',
        fan_count: 42000,
        location: 'Seattle, WA',
        status: 'unverified'
    },
    {
        of_username: 'sophia_angel',
        display_name: 'Sophia Angel',
        fan_count: 156000,
        location: 'San Diego, CA',
        status: 'verified',
        social_links: { instagram: '@sophiaangel', twitter: '@sophia_a', youtube: 'SophiaAngelOfficial' },
        luna_analysis: 'Elite tier. Multi-platform presence with YouTube indicates content diversification strategy. High barrier to entry for outreach; requires differentiated value proposition.'
    },
    {
        of_username: 'mia_exotic',
        display_name: 'Mia',
        fan_count: 21300,
        location: 'Houston, TX',
        status: 'unverified'
    },
    {
        of_username: 'aria_velvet',
        display_name: 'Aria Velvet',
        fan_count: 78500,
        location: 'Atlanta, GA',
        status: 'verified',
        social_links: { instagram: '@ariavelvet' },
        luna_analysis: 'Strong engagement in niche community. Loyal fanbase. Content style: Artistic, editorial. Collaboration potential: High for creative projects.'
    },
    {
        of_username: 'zoe_enchant',
        display_name: 'Zoe E.',
        fan_count: 19800,
        location: 'Denver, CO',
        status: 'unverified'
    },
];

async function seedModels() {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   SEEDING ONLYFINDER MODELS TABLE        ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');

    for (const model of SEED_MODELS) {
        const { data, error } = await supabase
            .from('models')
            .upsert(
                {
                    of_username: model.of_username,
                    display_name: model.display_name,
                    fan_count: model.fan_count,
                    location: model.location,
                    status: model.status,
                    primary_image_url: model.primary_image_url,
                    social_links: model.social_links || {},
                    luna_analysis: model.luna_analysis,
                    discovered_on: 'seed',
                },
                { onConflict: 'of_username' }
            )
            .select()
            .single();

        if (error) {
            console.error(`✗ Failed to seed ${model.of_username}:`, error.message);
        } else {
            console.log(`✓ Seeded: @${model.of_username} (${model.fan_count?.toLocaleString()} fans)`);
        }
    }

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`Seeding complete. ${SEED_MODELS.length} models processed.`);
    console.log('');
}

seedModels().catch(console.error);
