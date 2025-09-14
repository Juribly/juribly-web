import React, { useState } from "react";
import { validateComment } from "../lib/validate.js";
import { useToast } from "./toast/ToastProvider.jsx";
import api from "../lib/api.ts";

export default function CommentForm({ postId, onCreated }) {
  const [content, setContent] = useState("");
  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToast();

  async function submit(e) {
    e.preventDefault();
    setErrs({});
    const { ok, errors, data } = validateComment({ content });
    if (!ok) {
      setErrs(errors);
      push({ variant: "error", title: "Fix your comment", description: Object.values(errors)[0] || "Validation failed." });
      return;
    }
    try {
      setSubmitting(true);
      const json = await api.post(`/api/posts/${postId}/comments`, data);
      push({ variant: "success", title: "Comment added" });
      setContent("");
      onCreated?.(json);
    } catch (err) {
      push({ variant: "error", title: "Could not comment", description: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment…"
          className={`flex-1 rounded-xl border p-2.5 ${
            errs.content ? "border-rose-400" : "border-slate-200"
          }`}
          maxLength={600}
        />
        <button
          disabled={submitting}
          className="rounded-xl px-3 py-2 bg-black text-white disabled:opacity-50"
        >
          {submitting ? "…" : "Send"}
        </button>
      </div>
      {errs.content && <p className="text-xs text-rose-600 mt-1">{errs.content}</p>}
    </form>
  );
}
