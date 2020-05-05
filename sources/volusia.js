const { initPuppeteer } = require('../puppeteer');

let listingUrl = 'https://www.volusia.realforeclose.com/index.cfm?zaction=AUCTION&zmethod=PREVIEW&AuctionDate=04/21/2020'

const getListings = async (address, searchTerm, pageUrl=listingUrl) => {
    let listings = [];

    const { browser, page } = await initPuppeteer({
        // useStealth: true,
    });

    try {
        await new Promise(async (resolve, reject) => {
            try {
                await page.goto(pageUrl, {
                    timeout: 0,
                    waitUntil: 'networkidle0',
                });

                let items = [];
                await page.waitForSelector('.BLHeaderDateDisplay');
                let auctionDay = await page.$eval('.BLHeaderDateDisplay', elem => elem.textContent);
                const maxPages = parseInt(await page.$eval('#maxCA', elem => elem.textContent));
                let curPage;

                while(true) {
                    curPage = parseInt(await page.$eval('#curPCA', elem => elem.value));
                    const maxPages = parseInt(await page.$eval('#maxCA', elem => elem.textContent));
                    await page.waitForSelector('.AUCTION_ITEM');
                    const auctionItemElements = await page.$$('.AUCTION_ITEM')
                    for (let i=0; i<auctionItemElements.length; i++) {
                        const auctionItemElement = auctionItemElements[i]
                        const auctionStatus = await page.$eval('.ASTAT_MSGA', elem => elem.textContent)
                        const auctionStatusTimestamp = await page.$eval('.ASTAT_MSGB', elem => elem.textContent)
                        const auctionStatusAmount = await page.$eval('.ASTAT_MSGD', elem => elem.textContent)
                        const auctionSoldTo = await page.$eval('.ASTAT_MSG_SOLDTO_MSG', elem => elem.textContent)

                        const auctionDetailElements = await auctionItemElement.$$('.AUCTION_DETAILS tr');
                        const details = [];
                        for(let x=0; x<auctionDetailElements.length; x++) {
                            let item = auctionDetailElements[x];
                            const label = await item.$eval('.AD_LBL', elem => elem.textContent);
                            const data = await item.$eval('.AD_DTA', elem => elem.textContent);
                            const linkElement = await item.$('a')
                            if ( linkElement!== null) {
                                const link = await item.$eval('a', elem => elem.getAttribute('href'));
                                details.push({
                                    label,
                                    data,
                                    link
                                });
                            } else {
                                details.push({
                                    label,
                                    data
                                });
                            }
                        }

                        items.push({
                            details : details,
                            auctionStatus : auctionStatus,
                            auctionStatusTimestamp : auctionStatusTimestamp,
                            auctionStatusAmount : auctionStatusAmount,
                            auctionSoldTo : auctionSoldTo,
                        })
                    }

                    if (curPage > maxPages - 1)
                        break;

                    let previousPage = curPage
                    await page.click('div.Head_C span.PageRight')
                    while(true) {
                        curPage = parseInt(await page.$eval('#curPCA', elem => elem.value));
                        if (previousPage !== curPage) {
                            break;
                        }

                        await page.waitFor(10);
                    }

                }

                let data = {
                    auctionDay: auctionDay,
                    curPage : curPage,
                    maxPages : maxPages,
                    items: items,
                }

                // return data

                listings.push(data);

                resolve();
            } catch (error) {
                reject(error);
            }
        });

        await browser.close();

        return listings;
    } catch (error) {
        console.log(error);
        return listings;
    }
};

getListings()

module.exports = {
    getListings,
    listingUrl,
};