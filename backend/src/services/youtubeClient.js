const { YoutubeTranscript } = require('youtube-transcript');

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  throw Object.assign(new Error('Could not extract a video ID from that URL.'), { statusCode: 400 });
}

async function getVideoMetadata(videoId) {
  if (!process.env.YOUTUBE_API_KEY) {
    return { title: `YouTube video ${videoId}` };
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return { title: `YouTube video ${videoId}` };

  const data = await res.json();
  const snippet = data.items?.[0]?.snippet;
  return { title: snippet?.title || `YouTube video ${videoId}` };
}

async function getTranscript(videoUrl) {
  const videoId = extractVideoId(videoUrl);
  const metadata = await getVideoMetadata(videoId);

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = segments.map((s) => s.text).join(' ');
    return { videoId, title: metadata.title, transcript };
  } catch (err) {
    const wrapped = new Error(
      'Could not retrieve a transcript for this video. It may not have captions available.'
    );
    wrapped.statusCode = 422;
    throw wrapped;
  }
}

module.exports = { extractVideoId, getVideoMetadata, getTranscript };
