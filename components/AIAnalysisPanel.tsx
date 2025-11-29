import React from 'react';
import { AIAnalysisResult } from '../types';
import { Sparkles, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface AIAnalysisPanelProps {
  analysis: AIAnalysisResult | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ analysis, isLoading, onAnalyze }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-6 shadow-sm border border-indigo-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">AI Workforce Insights</h2>
        </div>
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isLoading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>
      </div>

      {!analysis && !isLoading && (
        <div className="text-center py-8 text-slate-500">
          <p>Click "Refresh Analysis" to generate insights using Gemini AI.</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-lg border border-indigo-50 shadow-sm">
            <p className="text-slate-700 text-sm leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-100 flex items-center space-x-4">
              <div className="p-2 bg-blue-50 rounded-full">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Efficiency Score</p>
                <div className="flex items-end space-x-2">
                  <span className="text-2xl font-bold text-slate-800">{analysis.efficiencyScore}</span>
                  <span className="text-xs text-slate-400 mb-1">/ 100</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-100 flex items-center space-x-4">
              <div className={`p-2 rounded-full ${
                analysis.burnoutRisk === 'High' ? 'bg-red-50' : 
                analysis.burnoutRisk === 'Medium' ? 'bg-orange-50' : 'bg-green-50'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  analysis.burnoutRisk === 'High' ? 'text-red-600' : 
                  analysis.burnoutRisk === 'Medium' ? 'text-orange-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Burnout Risk</p>
                <p className={`text-lg font-bold ${
                  analysis.burnoutRisk === 'High' ? 'text-red-600' : 
                  analysis.burnoutRisk === 'Medium' ? 'text-orange-600' : 'text-green-600'
                }`}>{analysis.burnoutRisk}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Observations</h3>
            <ul className="space-y-2">
              {analysis.keyInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;
