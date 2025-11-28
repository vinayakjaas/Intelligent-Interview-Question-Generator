import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

export async function POST(req) {
  try {
    const { resume } = await req.json();

    if (!resume || resume.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `You are an expert interviewer with years of experience in technical and behavioral interviews. Analyze the candidate's resume thoroughly and generate a comprehensive, tailored set of interview questions.

Generate 10-15 diverse, high-quality interview questions covering:
- Technical Skills (3-4 questions) - Focus on specific technologies, frameworks, and tools mentioned
- Projects & Experience (4-5 questions) - Deep dive into past projects, achievements, and work experience
- Behavioral & Soft Skills (2-3 questions) - Teamwork, leadership, communication, conflict resolution
- Problem-Solving & Critical Thinking (1-2 questions) - Analytical thinking and problem-solving approaches

Guidelines:
- Make questions specific to the candidate's background and experience
- Include follow-up potential questions where appropriate
- Vary question difficulty from foundational to advanced
- Ensure questions are actionable and help assess real competency

Format your response as a JSON array where each question is an object with:
- "question": the question text (clear, concise, and specific)
- "category": one of "Skills", "Projects", "Experience", "Behavioral", "Problem-Solving"

Return ONLY valid JSON array, no additional text, no markdown code blocks.`,
      messages: [
        {
          role: 'user',
          content: `Please analyze this resume and generate tailored interview questions:\n\n${resume}`,
        },
      ],
      maxTokens: 2500,
      temperature: 0.7,
    });

    let questions;
    try {
      const text = result.text.trim();
      const jsonText = text.replace(/^```json\s*|\s*```$/g, '').replace(/^```\s*|\s*```$/g, '').trim();
      questions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', result.text);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate questions. Please check your GROQ_API_KEY and try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

