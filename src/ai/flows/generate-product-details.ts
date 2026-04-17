'use server';
/**
 * @fileOverview A Genkit flow for generating product details (description, allergens, calories)
 *               based on the product's name and category.
 *
 * - generateProductDetails - A function that handles the product details generation process.
 * - GenerateProductDetailsInput - The input type for the generateProductDetails function.
 * - GenerateProductDetailsOutput - The return type for the generateProductDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductDetailsInputSchema = z.object({
  productName: z.string().describe("The name of the product."),
  category: z.string().describe("The category of the product (e.g., 'dairy', 'bakery', 'snacks')."),
});
export type GenerateProductDetailsInput = z.infer<typeof GenerateProductDetailsInputSchema>;

const GenerateProductDetailsOutputSchema = z.object({
  description: z.string().describe("A comprehensive and engaging product description."),
  allergens: z.array(z.string()).describe("An array of potential allergens present in the product, chosen from: 'gluten', 'dairy', 'nuts', 'soy', 'shellfish'. If no allergens are identified, return an empty array."),
  calories: z.number().int().describe("An estimated calorie count for the product."),
});
export type GenerateProductDetailsOutput = z.infer<typeof GenerateProductDetailsOutputSchema>;

export async function generateProductDetails(input: GenerateProductDetailsInput): Promise<GenerateProductDetailsOutput> {
  return generateProductDetailsFlow(input);
}

const productDetailsPrompt = ai.definePrompt({
  name: 'productDetailsPrompt',
  input: {schema: GenerateProductDetailsInputSchema},
  output: {schema: GenerateProductDetailsOutputSchema},
  prompt: `You are an expert product catalog assistant. Your task is to generate a comprehensive product description, identify potential allergens, and estimate calorie information for a given product.

Product Name: {{{productName}}}
Category: {{{category}}}

Based on the product name and category, generate the following:
1. A detailed and engaging product description.
2. A list of potential common allergens. Only include allergens if they are highly likely to be present based on the product. Choose from: 'gluten', 'dairy', 'nuts', 'soy', 'shellfish'. If no allergens are confidently identified, return an empty array.
3. An estimated whole number calorie count for a typical serving size of the product.`,
});

const generateProductDetailsFlow = ai.defineFlow(
  {
    name: 'generateProductDetailsFlow',
    inputSchema: GenerateProductDetailsInputSchema,
    outputSchema: GenerateProductDetailsOutputSchema,
  },
  async input => {
    const {output} = await productDetailsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate product details.');
    }
    return output;
  }
);
