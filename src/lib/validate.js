const ALLOWED_MEDIA_TYPES = ["image", "video"];
const MAX_CONTENT_LEN = 2000;
const MAX_URL_LEN = 2048;

export function validatePost({ content, media_url, media_type }) {
  const errors = {};

  const trimmed = (content || "").trim();
  if (!trimmed && !media_url) {
    errors.content = "Write something or attach media.";
  }
  if (trimmed.length > MAX_CONTENT_LEN) {
    errors.content = `Post is too long (${trimmed.length}/${MAX_CONTENT_LEN}).`;
  }

  if (media_url) {
    try {
      // Simple URL sanity check:
      const u = new URL(media_url);
      if (!/^https?:$/.test(u.protocol)) {
        errors.media_url = "Only http(s) URLs are allowed.";
      }
      if (media_url.length > MAX_URL_LEN) {
        errors.media_url = "URL is too long.";
      }
    } catch {
      errors.media_url = "Invalid media URL.";
    }
  }

  if (media_type) {
    if (!ALLOWED_MEDIA_TYPES.includes(media_type)) {
      errors.media_type = "Media type must be image or video.";
    }
    if (media_url && !media_type) {
      errors.media_type = "Select media type for the URL.";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { content: trimmed, media_url: media_url || null, media_type: media_type || null },
  };
}

export function validateComment({ content }) {
  const errors = {};
  const trimmed = (content || "").trim();
  if (!trimmed) errors.content = "Comment cannot be empty.";
  if (trimmed.length > 600) errors.content = `Comment too long (${trimmed.length}/600).`;
  return { ok: Object.keys(errors).length === 0, errors, data: { content: trimmed } };
}
