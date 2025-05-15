// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Google Suggest API
const fetchGoogleSuggest = async (keyword) => {
  try {
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: { client: 'firefox', q: keyword }
    });
    return response.data[1];
  } catch (err) {
    console.error('Google Suggest error:', err.message);
    return [];
  }
};

// DuckDuckGo Suggestions
const fetchDuckDuckGoSuggest = async (keyword) => {
  try {
    const response = await axios.get('https://duckduckgo.com/ac/', {
      params: { q: keyword, type: 'list' }
    });
    return response.data.map(item => item.phrase);
  } catch (err) {
    console.error('DuckDuckGo error:', err.message);
    return [];
  }
};

// Reddit (Pushshift API)
const fetchRedditPosts = async (keyword) => {
  try {
    const response = await axios.get('https://api.pushshift.io/reddit/search/submission/', {
      params: { q: keyword, size: 5, sort: 'desc', sort_type: 'score' }
    });
    return response.data.data.map(post => post.title);
  } catch (err) {
    console.error('Reddit error:', err.message);
    return [];
  }
};

// YouTube Suggest API
const fetchYouTubeSuggest = async (keyword) => {
  try {
    const response = await axios.get('https://suggestqueries.google.com/complete/search', {
      params: { client: 'youtube', ds: 'yt', q: keyword },
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return response.data[1].map(item => item[0]);
  } catch (err) {
    console.error('YouTube Suggest error:', err.message);
    return [];
  }
};

// Bing Suggest API (unofficial)
const fetchBingSuggest = async (keyword) => {
  try {
    const response = await axios.get('https://api.bing.com/qsonhs.aspx', {
      params: { type: 'cb', q: keyword }
    });
    const suggestions = response.data.AS.Results?.[0]?.Suggests?.map(s => s.Txt) || [];
    return suggestions;
  } catch (err) {
    console.error('Bing Suggest error:', err.message);
    return [];
  }
};

app.post('/keyword-insights', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  try {
    const [googleSuggest, duckSuggest, redditTitles, youtubeSuggest, bingSuggest] = await Promise.all([
      fetchGoogleSuggest(keyword),
      fetchDuckDuckGoSuggest(keyword),
      fetchRedditPosts(keyword),
      fetchYouTubeSuggest(keyword),
      fetchBingSuggest(keyword)
    ]);

    const allSuggestions = [...new Set([
      ...googleSuggest,
      ...duckSuggest,
      ...youtubeSuggest,
      ...bingSuggest
    ])];

    res.json({
      keyword,
      suggestions: allSuggestions,
      reddit_insights: redditTitles,
      source_count: {
        google: googleSuggest.length,
        duckduckgo: duckSuggest.length,
        youtube: youtubeSuggest.length,
        bing: bingSuggest.length,
        reddit: redditTitles.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch keyword insights', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Keyword Insights API running at http://localhost:${PORT}`);
});
