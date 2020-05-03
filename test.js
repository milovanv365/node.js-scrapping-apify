require('dotenv').config();
const path = require('path');
const fs = require('fs');

const { getPage, isValidItem } = require('./utils');

const sourcesPath = path.resolve(__dirname, './sources');

const files = fs.readdirSync(sourcesPath);

const sources = files.reduce((result, file) => {
  const [name] = file.split('.');
  result[name] = require(path.join(sourcesPath, `/${name}`));
  return result;
}, {});


const { env } = process;
// const { getPage } 
const {
  function: testFunction,
  county = 'Dublin',
  countryCode = 'ie',
  searchTerm = '',
  source,
  url,
} = env;

const { scrapePage, getListings, scrapePageRequestOptions } = sources[source];

console.log(`starting test ${source}...`);

if (testFunction === 'getListings') {
  console.log('testing getListings...');
  const main = async () => {
    const address = {
      county,
      countryCode,
    };
    const data = await getListings(address, searchTerm);
    fs.writeFileSync('./results/get-listing-results.json', JSON.stringify(data, null, 2));
    console.log('Ended : testFunction - getListings');
  };

  return main().catch(console.error);
}

if (testFunction === 'scrapePage') {
    const main = async () => {
    
    const { $, resolvedUrl } = await getPage({url, scrapePageRequestOptions});
    
    const data = await scrapePage({ url: resolvedUrl, $, existingData: {} });

    fs.writeFileSync('./results/get-scrape-page-results.json', JSON.stringify(data, null, 2));
  };

  return main().catch(console.error);
}

if (testFunction === 'all') {
  console.log('testing all...');
  const main = async () => {
    const address = {
      county,
      countryCode,
    };
    const listing = await getListings(address, searchTerm);
    fs.writeFileSync('./results/get-listing-results.json', JSON.stringify(listing, null, 2));
    console.log('Ended : testFunction - all: getListings()');

    const [{ url, ...existingData }] = listing;

    if (scrapePage) {
      const { $, resolvedUrl } = await getPage({url});
      const data = await scrapePage({ url: resolvedUrl, $, existingData });
      isValidItem(data);
      fs.writeFileSync('./results/full-test-results.json', JSON.stringify(data, null, 2));
      console.log('Ended : testFunction - all: scrapePage()');
    }
    console.log('Ended : testFunction - all');
  };

  return main().catch(console.error);
}