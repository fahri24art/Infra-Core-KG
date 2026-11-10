import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import http from '../../../services/http';

export default function KnowledgeBase() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const res = await http.get('/api/glpi/knowledge_base');
            setArticles(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const filtered = articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || (a.content && a.content.toLowerCase().includes(search.toLowerCase())));

    return (
        <div className="p-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Knowledge Base</h1>
                        <p className="text-sm text-gray-500">FAQ and troubleshooting guides for users</p>
                    </div>
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus size={20} />
                    <span>New Article</span>
                </button>
            </div>
            
            <div className="mb-6 relative max-w-xl">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search for answers..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(article => (
                    <Card key={article.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-gray-800 mb-1">{article.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2">{article.content}</p>
                                <div className="mt-4 flex items-center space-x-3 text-xs text-gray-400">
                                    <span className="bg-gray-100 px-2 py-1 rounded-full">{article.category || 'General'}</span>
                                    <span>Last updated: {new Date(article.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No articles found matching your search.
                </div>
            )}
        </div>
    );
}
