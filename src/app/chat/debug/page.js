"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/context/SocketContext';

export default function ChatDebugPage() {
  const { data: session, status } = useSession();
  const { socket, connected, sendMessage, joinConversation } = useSocket();
  const [logs, setLogs] = useState([]);
  const [testConversationId, setTestConversationId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [conversations, setConversations] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    addLog(`Session status: ${status}`);
    if (session?.user) {
      addLog(`User: ${session.user.name} (${session.user.id})`);
    }
  }, [status, session]);

  useEffect(() => {
    if (socket) {
      addLog(`Socket connected: ${socket.id}`);
      addLog(`Socket connected status: ${socket.connected}`);
    }
  }, [socket]);

  useEffect(() => {
    addLog(`Connected status changed: ${connected}`);
  }, [connected]);

  const loadConversations = async () => {
    addLog('Loading conversations...');
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      setConversations(data);
      addLog(`Loaded ${data.length} conversations`);
      if (data.length > 0) {
        setTestConversationId(data[0].id);
        addLog(`Set test conversation: ${data[0].id}`);
      }
    } catch (error) {
      addLog(`Error loading conversations: ${error.message}`);
    }
  };

  const testSendMessage = async () => {
    if (!testConversationId) {
      addLog('No conversation selected');
      return;
    }

    addLog(`=== Testing message send ===`);
    addLog(`Conversation ID: ${testConversationId}`);
    addLog(`Socket exists: ${!!socket}`);
    addLog(`Socket connected: ${socket?.connected}`);
    addLog(`User ID: ${session?.user?.id}`);

    // Test via socket
    if (socket && connected) {
      addLog('Sending via socket.emit...');
      sendMessage(testConversationId, testMessage || 'Test message ' + Date.now());
      addLog('Message emit called');
    } else {
      addLog('Socket not connected, using HTTP fallback...');
      try {
        const res = await fetch(`/api/chat/conversations/${testConversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: testMessage || 'Test message ' + Date.now(), type: 'text' }),
        });
        const data = await res.json();
        addLog(`HTTP Response: ${res.status} - ${JSON.stringify(data)}`);
      } catch (error) {
        addLog(`HTTP Error: ${error.message}`);
      }
    }
  };

  const testJoinConversation = () => {
    if (!testConversationId) {
      addLog('No conversation selected');
      return;
    }
    addLog(`Joining conversation: ${testConversationId}`);
    joinConversation(testConversationId);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Chat Debug Page</h1>

        {/* Session Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Session Info</h2>
          <p className="text-gray-600 dark:text-gray-300">Status: <span className="font-mono">{status}</span></p>
          {session?.user && (
            <>
              <p className="text-gray-600 dark:text-gray-300">Name: <span className="font-mono">{session.user.name}</span></p>
              <p className="text-gray-600 dark:text-gray-300">Email: <span className="font-mono">{session.user.email}</span></p>
              <p className="text-gray-600 dark:text-gray-300">User ID: <span className="font-mono">{session.user.id}</span></p>
            </>
          )}
        </div>

        {/* Socket Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Socket Info</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Socket ID: <span className="font-mono">{socket?.id || 'N/A'}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Connected: <span className={`font-mono ${connected ? 'text-green-500' : 'text-red-500'}`}>{connected ? 'Yes ✓' : 'No ✗'}</span>
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Test Controls</h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={loadConversations}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Load Conversations
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Logs
            </button>
          </div>

          {conversations.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Conversation:
              </label>
              <select
                value={testConversationId}
                onChange={(e) => setTestConversationId(e.target.value)}
                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
              >
                {conversations.map(conv => (
                  <option key={conv.id} value={conv.id}>
                    {conv.name} ({conv.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test Message:
            </label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Leave empty for auto-generated test message"
              className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={testJoinConversation}
              disabled={!testConversationId}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Join Conversation
            </button>
            <button
              onClick={testSendMessage}
              disabled={!testConversationId}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Send Test Message
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">Logs</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p>No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
