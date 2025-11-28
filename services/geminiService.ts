import { GoogleGenAI, Type } from "@google/genai";
import { TimesheetEntry, AIAnalysisResult } from "../types";

// Initialize Gemini Client
// CRITICAL: We assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_MODEL = "gemini-2.5-flash";
const GENERATION_MODEL = "gemini-2.5-flash";

/**
 * Analyzes a set of timesheet entries to provide management insights.
 */
export const analyzeTimesheetData = async (entries: TimesheetEntry[]): Promise<AIAnalysisResult> => {
  try {
    const prompt = `
      Analyze the following timesheet data for a team member. 
      Provide a management summary, an efficiency score (0-100), assess burnout risk based on hours and task variety, and list 3 key insights/bullet points.
      
      CRITICAL: Pay attention to 'dependencies' and 'taskName'. 
      - If a task depends on other tasks that are NOT approved or missing from this list (implied unmet), flag this as a potential blocker.
      - Use the specific 'taskName' to identify context switching or intense focus on specific projects.

      Data:
      ${JSON.stringify(entries.map(e => ({ 
        id: e.id,
        date: e.date, 
        duration: e.durationHours, 
        taskName: e.taskName,
        category: e.taskCategory, 
        desc: e.description,
        status: e.status,
        dependencies: e.dependencies 
      })))}
    `;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            efficiencyScore: { type: Type.NUMBER },
            burnoutRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            keyInsights: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["summary", "efficiencyScore", "burnoutRisk", "keyInsights"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    throw new Error("No analysis generated");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback if API fails or key is missing
    return {
      summary: "Could not generate analysis. Please check API Key configuration.",
      efficiencyScore: 0,
      burnoutRisk: "Low",
      keyInsights: ["Check connection", "Verify API Key", "Try again later"]
    };
  }
};

/**
 * Generates mock timesheet entries for a given date range.
 */
export const generateMockTimesheets = async (startDate: string, days: number): Promise<TimesheetEntry[]> => {
  try {
    const prompt = `
      Generate ${days} days of realistic software engineering timesheet entries starting from ${startDate}.
      Include varied tasks (Development, Meeting, Code Review, Bug Fix).
      Assign realistic taskNames from a set like 'PROJ-101', 'PROJ-102', 'MAINT-001'.
      Return a JSON array.
    `;

    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD" },
              startTime: { type: Type.STRING, description: "HH:mm 24h format" },
              endTime: { type: Type.STRING, description: "HH:mm 24h format" },
              durationHours: { type: Type.NUMBER },
              taskName: { type: Type.STRING, description: "Project ID and Name" },
              taskCategory: { type: Type.STRING },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["Approved", "Pending"] }
            },
            required: ["date", "startTime", "endTime", "durationHours", "taskName", "taskCategory", "description", "status"]
          }
        }
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      // Enrich with IDs and User info which might not be in the generative part
      return rawData.map((d: any, index: number) => ({
        ...d,
        id: `gen-${Date.now()}-${index}`,
        userId: "u1",
        userName: "Alex Dev",
        dependencies: [] 
      }));
    }
    return [];

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return [];
  }
};