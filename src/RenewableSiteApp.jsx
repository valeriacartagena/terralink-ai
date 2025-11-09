import React, { useState } from 'react';
import { Send, Settings, Database, Menu, TrendingUp } from 'lucide-react';
import SiteMap from './SiteMap';

const RenewableSiteApp = () => {
  const [messages, setMessages] = useState([
    { role: 'agent', text: '👋 Hi! I\'m your renewable energy site analyst. What type of project are you planning?' }
  ]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('parameters');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sites, setSites] = useState([]);
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
        { role: 'agent', text: '🔍 Analyzing your request...' }
      ]);
      
      const chatResponse = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery })
      });
      
      if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.error || errorData.response || 'Chat request failed');
      }
      
      const chatData = await chatResponse.json();
      
      setMessages(prev => [...prev, 
        { role: 'agent', text: chatData.response }
      ]);
      
      // If region was not found, don't proceed to analysis
      if (chatData.needs_clarification) {
        setMessages(prev => [...prev, 
          { role: 'agent', text: '💡 Tip: Try being more specific with your location, like "solar farm in California" or "wind energy in Nevada"' }
        ]);
        return;
      }
      
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
      
      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        setMessages(prev => [...prev, 
          { role: 'agent', text: `❌ ${errorData.error || 'Analysis failed'}` }
        ]);
        if (errorData.suggestions) {
          setMessages(prev => [...prev, 
            { role: 'agent', text: `💡 ${errorData.suggestions}` }
          ]);
        }
        return;
      }
      
      const analyzeData = await analyzeResponse.json();
      
      if (analyzeData.success) {
        // Store sites for map
        setSites(analyzeData.sites);
        
        setMessages(prev => [...prev, 
          { role: 'agent', text: analyzeData.explanation }
        ]);
        
        console.log('✅ Sites found:', analyzeData.sites);
        setMessages(prev => [...prev, 
          { role: 'agent', text: `📊 Found ${analyzeData.total_analyzed} sites! Top site scores ${analyzeData.sites[0].score}/100. Check the map!` }
        ]);
        
        // Store predictions if available
        if (analyzeData.predictions) {
          setPredictions(analyzeData.predictions);
          setShowPredictions(true);
        }
      } else {
        setMessages(prev => [...prev, 
          { role: 'agent', text: `❌ ${analyzeData.error || 'Analysis was not successful'}` }
        ]);
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
          <div className="text-2xl"></div>
          <div>
            <h1 className="text-lg font-bold">TerraLink</h1>
            <p className="text-xs text-slate-400">Powered by Google Gemini & GEE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showPredictions && (
            <button 
              onClick={() => setActiveTab('predictions')}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition text-sm flex items-center gap-2"
            >
              <TrendingUp size={16} />
              Predictions
            </button>
          )}
          <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm">
            Settings
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-20 w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700 flex flex-col transition-transform duration-300`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`${msg.role === 'agent' ? 'bg-slate-700/50' : 'bg-green-900/30'} rounded-lg p-3 text-sm animate-fadeIn`}
              >
                {msg.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-xs">
                      🤖
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
                <span>Analyzing...</span>
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
              {['Solar', 'Wind', 'Hydro', 'Geothermal'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setInput(`Find ${type.toLowerCase()} sites`)}
                  className="bg-slate-700 hover:bg-green-600 rounded-lg p-2 text-xs transition"
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">💡 Tip: Include a location like "in California" or "in Texas"</p>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative bg-slate-800">
            {/* Map Component */}
            <SiteMap sites={sites} />

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex gap-2 z-[1000]">
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
                </div>
              )}

              {activeTab === 'datasets' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 mb-4">Active datasets from Google Earth Engine</p>
                  
                  {datasets.map((dataset, idx) => (
                    <div key={idx} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={dataset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-400 hover:text-blue-300"
                        >
                          {dataset.name}
                        </a>
                        <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                          {dataset.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{dataset.source}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'predictions' && predictions && (
                <div className="space-y-4">
                  <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="text-purple-400" size={20} />
                      <h3 className="text-sm font-bold text-purple-400">AI-Powered Predictions</h3>
                    </div>
                    
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