'use client';

import { useState } from 'react';

export default function Studio({ params }: { params: { id: string } }) {
  const { id } = params;
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = `/generated/${id}/index.html`;

  async function send() {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/update-project', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, instruction: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Update failed');
      const iframe = document.getElementById('preview') as HTMLIFrameElement;
      if (iframe) iframe.src = `${preview}?t=${Date.now()}`;
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
      setMsg('');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-[100dvh]">
      <div className="p-4 space-y-3 border-r">
        <h1 className="text-xl font-semibold">Studio: {id}</h1>
        <textarea
          className="w-full h-40 rounded-xl border p-3"
          placeholder="Describe the change: Add a dark mode toggle, enlarge H1, and animate buttons on hover."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {busy ? 'Updating…' : 'Apply Update'}
        </button>
        <p className="text-sm opacity-70">Preview auto-reloads on update.</p>
      </div>
      <div className="p-0">
        <iframe id="preview" src={preview} className="w-full h-full" />
      </div>
    </div>
  );
}

