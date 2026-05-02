const https = require('https');

const API_KEY = 'AIzaSyAQ0eD7ERSmGPiIithFqvwbWpmJSHJjUTI';
const SEARCH_ENGINE_ID = 'c0134ac7bb4a1471b';

const query = 'Bitcoin price prediction';
const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;

console.log('Testing Google Custom Search API...');
console.log('URL:', url.replace(API_KEY, '***'));

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 1000));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});