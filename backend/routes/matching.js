require('dotenv').config();

const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs/promises');
const path = require('path');

// Initialize the Anthropic client
// It automatically reads ANTHROPIC_API_KEY from process.env
const client = new Anthropic();

// POST /api/matching/find-athletes
router.post('/find-athletes', async (req, res) => {
  try {
    const { criteria } = req.body;

    // Load athlete database
    const athletesPath = path.join(__dirname, '../data/athletes.json');
    const athletesRaw = await fs.readFile(athletesPath, 'utf-8');
    const athletes = JSON.parse(athletesRaw);

    // If no athletes exist yet, return helpful message
    if (!athletes || athletes.length === 0) {
      return res.json({ 
        matches: [],
        message: 'No athletes in the database yet.'
      });
    }

    // Build the prompt for Claude
    const prompt = `
You are an expert sports recruiting analyst for the EAT SLEEP BREATHE SPORTS platform.

A coach has submitted the following recruiting criteria:
- Sport: ${criteria.sport || 'Any'}
- Position: ${criteria.position || 'Any'}
- Minimum GPA: ${criteria.minGPA || 'No minimum'}
- Graduation Year: ${criteria.gradYear || 'Any'}
- Location Preference: ${criteria.location || 'Any'}

Here is the current athlete database:
${JSON.stringify(athletes, null, 2)}

Your task:
1. Review each athlete against the coach's criteria
2. Rank the athletes from best match to least match
3. For each athlete provide a brief 1-2 sentence explanation of why they match

Return your response as valid JSON only, with this exact structure:
{
  "matches": [
    {
      "athleteId": "the athlete's id",
      "name": "athlete's name",
      "matchScore": 85,
      "reasoning": "This athlete is a strong match because...",
      "profile": {}
    }
  ]
}

Only include athletes with a matchScore of 60 or above. Sort by matchScore descending.
Return ONLY the JSON, no other text.
    `;

    // Call the Claude API
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse Claude's response
    // const responseText = message.content[0].text;
    // const parsedResponse = JSON.parse(responseText);

    // Parse Claude's response
    // Strip markdown code fences if Claude wrapped the JSON in them
const responseText = message.content[0].text
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

const parsedResponse = JSON.parse(responseText);

    res.json(parsedResponse);

  } catch (error) {
    console.error('AI Matching Error:', error);
    res.status(500).json({ 
      error: 'AI matching failed', 
      details: error.message 
    });
  }
});

module.exports = router;