import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { BridgeCard } from './BridgeCard';

interface Bridge {
    id: string;
    name: string;
    active: boolean;
    slackChannelId: string;
    whatsappGroupId: string;
}

interface BridgeDashboardProps {
    bridges: Bridge[];
    onUpsertBridge: (bridge: Bridge) => void;
    onDeleteBridge: (id: string) => void;
    onToggleBridge: (id: string, active: boolean) => void;
}

export const BridgeDashboard: React.FC<BridgeDashboardProps> = ({ bridges, onUpsertBridge, onDeleteBridge, onToggleBridge }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBridge, setEditingBridge] = useState<Bridge | null>(null);
    const [formData, setFormData] = useState<Partial<Bridge>>({});

    const handleOpenModal = (bridge?: Bridge) => {
        if (bridge) {
            setEditingBridge(bridge);
            setFormData(bridge);
        } else {
            setEditingBridge(null);
            setFormData({ name: '', active: true, slackChannelId: '', whatsappGroupId: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name) {
            onUpsertBridge({
                id: editingBridge?.id || '', // Backend will generate ID if empty
                name: formData.name,
                active: formData.active ?? true,
                slackChannelId: formData.slackChannelId || '',
                whatsappGroupId: formData.whatsappGroupId || ''
            });
            setIsModalOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Your Bridges</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                >
                    <Plus size={20} />
                    <span>Add Bridge</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bridges.map(bridge => (
                    <BridgeCard
                        key={bridge.id}
                        bridge={bridge}
                        onToggle={onToggleBridge}
                        onEdit={handleOpenModal}
                        onDelete={onDeleteBridge}
                    />
                ))}

                {bridges.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-700 rounded-xl text-gray-500">
                        <p className="text-lg mb-2">No bridges configured yet.</p>
                        <button onClick={() => handleOpenModal()} className="text-blue-400 hover:text-blue-300 underline">
                            Create your first bridge
                        </button>
                    </div>
                )}
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingBridge ? 'Edit Bridge' : 'New Bridge'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Bridge Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="e.g. General Chat"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Slack Channel ID</label>
                                <input
                                    type="text"
                                    value={formData.slackChannelId || ''}
                                    onChange={e => setFormData({ ...formData, slackChannelId: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="e.g. C12345678"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp Group ID</label>
                                <input
                                    type="text"
                                    value={formData.whatsappGroupId || ''}
                                    onChange={e => setFormData({ ...formData, whatsappGroupId: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="e.g. 123456789@g.us"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    You can copy this from the logs or select from the list later (future feature).
                                </p>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Save Bridge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
