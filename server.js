// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

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

const fetchGoogleTrends = async (keyword) => {
  return new Promise((resolve, reject) => {
    const encodedKeyword = encodeURIComponent(keyword);
    const command = `python3 trends.py "${encodedKeyword}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Google Trends error:', error.message);
        return resolve([]);
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        console.error('Trends parse error:', parseErr.message);
        resolve([]);
      }
    });
  });
};

const fetchWikidata = async (keyword) => {
  try {
    const response = await axios.get('https://www.wikidata.org/w/api.php', {
      params: {
        action: 'wbsearchentities',
        search: keyword,
        language: 'en',
        format: 'json'
      }
    });
    return response.data.search.map(entry => entry.label);
  } catch (err) {
    console.error('Wikidata error:', err.message);
    return [];
  }
};

const fetchStackExchange = async (keyword) => {
  try {
    const response = await axios.get('https://api.stackexchange.com/2.3/search/advanced', {
      params: {
        order: 'desc',
        sort: 'votes',
        q: keyword,
        site: 'stackoverflow'
      }
    });
    return response.data.items.map(q => q.title);
  } catch (err) {
    console.error('StackExchange error:', err.message);
    return [];
  }
};

const fetchExplodingTopics = async (keyword) => {
  try {
    const response = await axios.get(`https://trends.explodingtopics.com/api/search`, {
      params: { q: keyword }
    });
    return response.data.terms?.map(t => t.name) || [];
  } catch (err) {
    console.error('Exploding Topics error:', err.message);
    return [];
  }
};

app.post('/keyword-insights', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  try {
    const [googleSuggest, duckSuggest, redditTitles, youtubeSuggest, bingSuggest, trends, wikidata, stackexchange, explodingTopics] = await Promise.all([
      fetchGoogleSuggest(keyword),
      fetchDuckDuckGoSuggest(keyword),
      fetchRedditPosts(keyword),
      fetchYouTubeSuggest(keyword),
      fetchBingSuggest(keyword),
      fetchGoogleTrends(keyword),
      fetchWikidata(keyword),
      fetchStackExchange(keyword),
      fetchExplodingTopics(keyword)
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
      trends,
      wikidata,
      stackexchange,
      explodingTopics,
      source_count: {
        google: googleSuggest.length,
        duckduckgo: duckSuggest.length,
        youtube: youtubeSuggest.length,
        bing: bingSuggest.length,
        reddit: redditTitles.length,
        trends: trends.length,
        wikidata: wikidata.length,
        stackexchange: stackexchange.length,
        explodingTopics: explodingTopics.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch keyword insights', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Keyword Insights API running at http://localhost:${PORT}`);
});
