'use server';
/**
 * @fileOverview A Genkit flow to clarify product offer terms based on a natural language question.
 *
 * - clarifyProductOffer - A function that handles the product offer clarification process.
 * - ClarifyProductOfferInput - The input type for the clarifyProductOffer function.
 * - ClarifyProductOfferOutput - The return type for the clarifyProductOffer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClarifyProductOfferInputSchema = z.object({
  offerDetails: z.string().describe("The full details of the product offer, including its terms and conditions."),
  userQuestion: z.string().describe("The user's natural language question about the offer."),
});
export type ClarifyProductOfferInput = z.infer<typeof ClarifyProductOfferInputSchema>;

const ClarifyProductOfferOutputSchema = z.object({
  explanation: z.string().describe("A clear and instant explanation of the offer's terms and conditions, addressing the user's question."),
});
export type ClarifyProductOfferOutput = z.infer<typeof ClarifyProductOfferOutputSchema>;

export async function clarifyProductOffer(input: ClarifyProductOfferInput): Promise<ClarifyProductOfferOutput> {
  return clarifyProductOfferFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clarifyProductOfferPrompt',
  input: {schema: ClarifyProductOfferInputSchema},
  output: {schema: ClarifyProductOfferOutputSchema},
  prompt: `You are an AI assistant specialized in clarifying product offers. Your goal is to provide clear, concise, and instant explanations of offer terms and conditions based on the provided offer details and a user's specific question.

Offer Details:
{{{offerDetails}}}

User's Question:
{{{userQuestion}}}

Based on the above, provide a clear explanation that directly answers the user's question. If the information is not explicitly available in the offer details, state that you cannot provide a definitive answer.`,
});

const clarifyProductOfferFlow = ai.defineFlow(
  {
    name: 'clarifyProductOfferFlow',
    inputSchema: ClarifyProductOfferInputSchema,
    outputSchema: ClarifyProductOfferOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
