import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Send, Paperclip, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import { getSocket } from '../services/socket';

export default function Messages() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState([]);
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [partnerName, setPartnerName] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get('/messages/conversations').then(({ data }) => setConversations(data.conversations)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    api.get(`/messages/${userId}`).then(({ data }) => setThread(data.messages)).catch(() => {});

    const convo = conversations.find((c) => c.partner_id === userId);
    if (convo) setPartnerName(convo.partner_name);
  }, [userId, conversations]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (msg) => {
      if (msg.sender_id === userId || msg.receiver_id === userId) {
        setThread((prev) => [...prev, msg]);
      }
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.partner_id === msg.sender_id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: msg.content, created_at: msg.created_at };
        return updated;
      });
    };
    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim() && !attachment) return;
    try {
      const fd = new FormData();
      fd.append('receiverId', userId);
      if (content) fd.append('content', content);
      if (attachment) fd.append('attachment', attachment);
      const { data } = await api.post('/messages', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setThread((prev) => [...prev, data.message]);
      setContent('');
      setAttachment(null);
    } catch {
      // silent fail is acceptable here; input remains for retry
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-0 px-0 sm:px-6 md:grid-cols-[300px_1fr] md:gap-6 md:px-6 md:py-10">
      <aside className="hidden border-r border-navy-800 md:block md:border-r-0 md:rounded-lg md:border md:border-navy-700 md:bg-navy-900/50">
        <div className="border-b border-navy-800 px-4 py-3">
          <h2 className="font-display text-lg font-medium">Messages</h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {conversations.length === 0 && (
            <p className="px-4 py-6 text-center font-body text-sm text-parchment/40">No conversations yet.</p>
          )}
          {conversations.map((c) => (
            <Link
              key={c.partner_id}
              to={`/messages/${c.partner_id}`}
              className={`flex items-center gap-3 border-b border-navy-800 px-4 py-3 transition hover:bg-navy-800/50 ${
                c.partner_id === userId ? 'bg-navy-800/70' : ''
              }`}
            >
              <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-navy-700">
                {c.partner_avatar && <img src={c.partner_avatar} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-medium">{c.partner_name}</p>
                <p className="truncate font-body text-xs text-parchment/50">{c.content || 'Sent an attachment'}</p>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[70vh] flex-col md:rounded-lg md:border md:border-navy-700 md:bg-navy-900/50">
        {!userId ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageCircle size={32} className="text-parchment/30" />
            <p className="mt-3 font-body text-sm text-parchment/60">Select a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-navy-800 px-4 py-3">
              <h2 className="font-body text-sm font-semibold">{partnerName || 'Conversation'}</h2>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {thread.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3.5 py-2 font-body text-sm ${
                      m.sender_id === user.id ? 'bg-teal-500 text-ink' : 'bg-navy-800 text-parchment/90'
                    }`}
                  >
                    {m.content && <p>{m.content}</p>}
                    {m.attachment_url && (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className="mt-1 block underline">
                        Attachment
                      </a>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-navy-800 px-4 py-3">
              <label className="btn-ghost !px-2 cursor-pointer">
                <Paperclip size={16} />
                <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
              </label>
              <input
                className="input flex-1"
                placeholder={attachment ? `Attached: ${attachment.name}` : 'Type a message…'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button type="submit" className="btn-primary !px-3.5">
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
