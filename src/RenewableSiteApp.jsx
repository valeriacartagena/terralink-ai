import React, { useState } from 'react';
import { Send, Settings, Database, X, Menu, MapPin, TrendingUp, AlertCircle } from 'lucide-react';

const RenewableSiteApp = () => {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '👋 Hi! I\'m your AI renewable energy analyst powered by Google Gemini. What type of project are you planning?' }
  ]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('parameters');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);
  
  const [parameters, setParameters] = useState({
    irradiance: { weight: 40, min: 5, max: 8, unit: 'kWh/m²/day' },
    slope: { weight: 30, min: 0, max: 5, unit: '°' },
    landCover: { weight: 20, min: 0, max: 100, unit: '%' },
    protectedArea: { weight: 10, min: 5, max: 50, unit: 'km' }
  });
  
  const [datasets, setDatasets] = useState([
    { 
      name: 'Solar Irradiance', 
      source: 'ECMWF/ERA5_LAND', 
      status: 'active',
      url: 'https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND'
    },
    { 
      name: 'Elevation/Slope', 
      source: 'USGS/SRTMGL1_003', 
      status: 'active',
      url: 'https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003'
    },
    { 
      name: 'Land Cover', 
      source: 'ESA/WorldCover/v200', 
      status: 'active',
      url: 'https://developers.google.com/earth-engine/datasets/catalog/ESA_WorldCover_v200'
    },
    { 
      name: 'Protected Areas', 
      source: 'WCMC/WDPA/current', 
      status: 'active',
      url: 'https://developers.google.com/earth-engine/datasets/catalog/WCMC_WDPA_current_polygons'
    }
  ]);

  const API_URL = 'http://localhost:5001/api';

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userQuery = input;
    setMessages([...messages, { role: 'user', text: userQuery }]);
    setInput('');
    setIsAnalyzing(true);
    
    try {
      setMessages(prev => [...prev, 
        { role: 'agent', text: '🔍 Analyzing your request with Gemini AI...' }
      ]);
      
      const chatResponse = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery })
      });
      
      const chatData = await chatResponse.json();
      
      setMessages(prev => [...prev, 
        { role: 'agent', text: chatData.response }
      ]);
      
      if (chatData.datasets) {
        setDatasets(chatData.datasets.map(d => ({
          name: d.name,
          source: d.gee_id,
          status: 'active',
          url: d.url
        })));
      }
      
      setMessages(prev => [...prev, 
        { role: 'agent', text: '🛰️ Querying Google Earth Engine...' }
      ]);
      
      const analyzeResponse = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      });
      
      const analyzeData = await analyzeResponse.json();
      
      if (analyzeData.success) {
        setMessages(prev => [...prev, 
          { role: 'agent', text: analyzeData.explanation }
        ]);
        
        console.log('✅ Sites found:', analyzeData.sites);
        setMessages(prev => [...prev, 
          { role: 'agent', text: `📊 Found ${analyzeData.total_analyzed} sites! Top site scores ${analyzeData.sites[0].score}/100.` }
        ]);
        
        // Store predictions
        if (analyzeData.predictions) {
          setPredictions(analyzeData.predictions);
          setMessages(prev => [...prev, 
            { role: 'agent', text: `🔮 Predictive analysis complete! Click "View Predictions" to see future trends and forecasts.` }
          ]);
          setShowPredictions(true);
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', error);
      setMessages(prev => [...prev, 
        { role: 'agent', text: '❌ Connection error. Make sure backend is running on localhost:5001' }
      ]);
    }
    
    setIsAnalyzing(false);
  };

  const updateParameter = (key, field, value) => {
    setParameters(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: parseFloat(value) }
    }));
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-white overflow-hidden">
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition"
          >
            <Menu size={20} />
          </button>
          <div className="text-2xl">🌍</div>
          <div>
            <h1 className="text-lg font-bold">TerraLink AI</h1>
            <p className="text-xs text-slate-400">Powered by Google Gemini & Google Earth Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showPredictions && (
            <button 
              onClick={() => setActiveTab('predictions')}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition text-sm flex items-center gap-2"
            >
              <TrendingUp size={16} />
              View Predictions
            </button>
          )}
          <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm">
            Settings
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-20 w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700 flex flex-col transition-transform duration-300`}>
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <input
                type="text"
                placeholder="What type of site are you looking for?"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:border-green-500 transition"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-500 transition">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`${msg.role === 'agent' ? 'bg-slate-700/50' : 'bg-green-900/30'} rounded-lg p-3 text-sm animate-fadeIn`}
              >
                {msg.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-xs">
                      
                    </div>
                    <span className="text-xs text-slate-400">Gemini Agent</span>
                  </div>
                )}
                <p className="text-slate-100">{msg.text}</p>
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <div className="animate-pulse">⏳</div>
                <span>Analyzing with Gemini...</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything about renewable sites..."
                className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500 transition"
              />
              <button
                onClick={handleSend}
                disabled={isAnalyzing}
                className="bg-green-600 hover:bg-green-500 rounded-lg p-2 transition disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Quick Select Energy Type</p>
            <div className="grid grid-cols-2 gap-2">
              {['☀️ Solar', '💨 Wind', '💧 Hydro', '🔥 Geothermal'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setInput(`Find a ${type.split(' ')[1].toLowerCase()} farm site in Texas`)}
                  className="bg-slate-700 hover:bg-green-600 rounded-lg p-2 text-xs transition"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative bg-slate-800">
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-slate-800 to-blue-900/20">
              <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                <div className="text-center">
                  <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Interactive Map</p>
                  <p className="text-xs text-slate-500">Connected to Google Earth Engine</p>
                </div>
              </div>
              
              <div className="absolute top-1/3 left-1/2 w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
              <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
              <div className="absolute top-2/3 left-2/3 w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-lg shadow-yellow-500/50"></div>
            </div>

            <div className="absolute top-4 right-4 flex gap-2">
              <button className="bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 px-3 py-2 rounded-lg text-xs transition">
                Satellite
              </button>
              <button className="bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700 px-3 py-2 rounded-lg text-xs transition">
                Heatmap
              </button>
            </div>
          </div>

          <div className="bg-slate-800/90 backdrop-blur-sm border-t border-slate-700">
            <div className="flex border-b border-slate-700 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('parameters')}
                className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap ${
                  activeTab === 'parameters' 
                    ? 'border-b-2 border-green-500 text-green-500' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings size={16} className="inline mr-2" />
                Parameters
              </button>
              <button 
                onClick={() => setActiveTab('datasets')}
                className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap ${
                  activeTab === 'datasets' 
                    ? 'border-b-2 border-green-500 text-green-500' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database size={16} className="inline mr-2" />
                Data Sources
              </button>
              {showPredictions && (
                <button 
                  onClick={() => setActiveTab('predictions')}
                  className={`px-6 py-3 text-sm font-medium transition whitespace-nowrap ${
                    activeTab === 'predictions' 
                      ? 'border-b-2 border-purple-500 text-purple-500' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrendingUp size={16} className="inline mr-2" />
                  Predictions
                </button>
              )}
            </div>

            <div className="p-4 max-h-64 overflow-y-auto">
              {activeTab === 'parameters' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 mb-4">Adjust weights and ranges for optimization criteria</p>
                  
                  {Object.entries(parameters).map(([key, param]) => (
                    <div key={key} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <span className="text-xs text-slate-400">{param.weight}% weight</span>
                      </div>
                      
                      <div className="mb-3">
                        <label className="text-xs text-slate-400 block mb-1">Weight</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={param.weight}
                          onChange={(e) => updateParameter(key, 'weight', e.target.value)}
                          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Min {param.unit}</label>
                          <input
                            type="number"
                            value={param.min}
                            onChange={(e) => updateParameter(key, 'min', e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Max {param.unit}</label>
                          <input
                            type="number"
                            value={param.max}
                            onChange={(e) => updateParameter(key, 'max', e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button className="w-full bg-green-600 hover:bg-green-500 rounded-lg py-2 text-sm font-medium transition">
                    Apply Parameters & Reanalyze
                  </button>
                </div>
              )}

              {activeTab === 'datasets' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 mb-4">Active datasets from Google Earth Engine (click to view docs)</p>
                  
                  {datasets.map((dataset, idx) => (
                    <div key={idx} className="bg-slate-700/50 rounded-lg p-4 flex items-start justify-between group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={dataset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 transition inline-flex items-center gap-1"
                          >
                            {dataset.name}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                            {dataset.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">{dataset.source}</p>
                      </div>
                      <button 
                        onClick={() => setDatasets(datasets.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-400 transition ml-3"
                        title="Remove dataset"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-sm font-medium transition border border-slate-600 border-dashed">
                    + Add Custom Dataset
                  </button>
                </div>
              )}

              {activeTab === 'predictions' && predictions && (
                <div className="space-y-4">
                  <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="text-purple-400" size={20} />
                      <h3 className="text-sm font-bold text-purple-400">AI-Powered Predictions</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">Generated by Google Gemini based on site analysis</p>
                    
                    <div className="space-y-3">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">2025 Forecast</div>
                        <div className="text-sm text-slate-100">{predictions.forecast_2025}</div>
                      </div>
                      
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">2030 Forecast</div>
                        <div className="text-sm text-slate-100">{predictions.forecast_2030}</div>
                      </div>
                      
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-2">Confidence Score</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-600 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${predictions.confidence_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-green-400">{predictions.confidence_score}%</span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-2">Key Trends</div>
                        <ul className="space-y-1">
                          {predictions.key_trends?.map((trend, idx) => (
                            <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                              <span className="text-green-400 mt-0.5">▸</span>
                              <span>{trend}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="text-yellow-400" size={14} />
                            <div className="text-xs font-medium text-yellow-400">Risk Factors</div>
                          </div>
                          <ul className="space-y-1">
                            {predictions.risk_factors?.map((risk, idx) => (
                              <li key={idx} className="text-xs text-slate-200">• {risk}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="text-green-400" size={14} />
                            <div className="text-xs font-medium text-green-400">Opportunities</div>
                          </div>
                          <ul className="space-y-1">
                            {predictions.opportunities?.map((opp, idx) => (
                              <li key={idx} className="text-xs text-slate-200">• {opp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default RenewableSiteApp;