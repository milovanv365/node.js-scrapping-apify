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

                await page.waitForSelector('.BLHeaderDateDisplay');
                const auctionDay = await page.$eval('.BLHeaderDateDisplay', elem => elem.textContent);
                let dataPerPage = [];

                var dataType = 'div'
                const countyName = 'Orange'

                const classSelectorW = 'Head_W'
                const maxPagesW = parseInt(await page.$eval('#maxWA', elem => elem.textContent));
                const curPageSelectorW = 'curPWA'

                const classSelectorC = 'Head_C'
                const maxPagesC = parseInt(await page.$eval('#maxCA', elem => elem.textContent));
                const curPageSelectorC = 'curPCA'

                const scrapeIt = async(classSelector,maxPages,curPageSelector) => {
                    let items = [];
                    let pagesProcessed = 0
                    let auctionClassItemCount = 0

                    for (let p = 0; p < maxPages; p++) {

                        await page.waitForSelector('.AUCTION_ITEM');
                        const auctionItemElements = await page.$$('.' + classSelector + ' .AUCTION_ITEM')
                        auctionClassItemCount = auctionItemElements.length

                        let curPage = parseInt(await page.$eval('#' + curPageSelector, elem => elem.value));


                        for (let i = 0; i < auctionClassItemCount; i++) {
                            const auctionItemElement = auctionItemElements[i]
                            const auctionStatus = await page.$eval('.ASTAT_MSGA', elem => elem.textContent)
                            const auctionStatusTimestamp = await page.$eval('.ASTAT_MSGB', elem => elem.textContent)
                            const auctionStatusAmount = await page.$eval('.ASTAT_MSGD', elem => elem.textContent)
                            const auctionSoldTo = await page.$eval('.ASTAT_MSG_SOLDTO_MSG', elem => elem.textContent)

                            const auctionDetailElements = await auctionItemElement.$$('.AUCTION_DETAILS');
                            const auctionDetailElementCount = auctionDetailElements.length
                            let details = [];

                            for (let x = 0; x < auctionDetailElementCount; x++) {
                                const item = auctionDetailElements[x]

                                if ( dataType == 'div') {  // DIV div or table processing
                                    const auctionDetailDivElements = await item.$$('div');
                                    var detailDivCount = auctionDetailDivElements.length - 2
                                    for (let y = 0; y < detailDivCount; y++) {
                                        var y1 = y + 1
                                        var y2 = y + 2

                                        const myClassName = await item.$eval('.ad_tab div:nth-child(' + y1 + ')', elem => elem.className);

                                        if ( myClassName == 'AD_LBL') {
                                            const label = await item.$eval('.ad_tab div:nth-child(' + y1 + ')', elem => elem.textContent);
                                            const data = await item.$eval('.ad_tab div:nth-child(' + y2 + ')', elem => elem.textContent);


                                            const linkElement = await item.$('.ad_tab div:nth-child(' + y2 + ') a')
                                            if (linkElement !== null) {
                                                const link = await item.$eval('.ad_tab div:nth-child(' + y2 + ') a', elem => elem.getAttribute('href'));
                                                details.push({
                                                    // y1,
                                                    // myClassName,
                                                    label,
                                                    data,
                                                    link,
                                                })
                                            } else { // no link
                                                details.push({
                                                    // y1,
                                                    // myClassName,
                                                    label,
                                                    data,
                                                });
                                            }
                                            y = y + 1 // processing label and data as a pair so need an extra div increment
                                        }
                                    }
                                } else {  // must be dataType = table
                                    const label = await item.$eval('.AD_LBL', elem => elem.textContent);
                                    const data = await item.$eval('.AD_DTA', elem => elem.textContent);
                                    const linkElement = await item.$('a')
                                    if (linkElement !== null) {
                                        const link = await item.$eval('a', elem => elem.getAttribute('href'));
                                        details.push({
                                            label,
                                            data,
                                            link,
                                        });
                                    } else {
                                        details.push({
                                            label,
                                            data,
                                        });
                                    }
                                } // end of div/table detail IF
                                items.push({
                                    details: details,
                                    auctionStatus: auctionStatus,
                                    auctionStatusTimestamp: auctionStatusTimestamp,
                                    auctionStatusAmount: auctionStatusAmount,
                                    auctionSoldTo: auctionSoldTo,
                                    classSelector: classSelector,
                                    auctionDetailElementCount: auctionDetailElementCount,
                                    item: i,
                                    detailDivCount: detailDivCount,
                                    curPage: curPage,
                                })
                            } // end of Auction Detail processing
                        } // end of Auction Item processing


                        pagesProcessed = pagesProcessed + 1

                        if (curPage > maxPages - 1)
                            break;

                        // await page.click('.' + classSelector + ' span.PageRight')
                        // await page.waitFor(1000);

                        let previousPage = curPage
                        await page.click('.' + classSelector + ' span.PageRight')

                        while(true) {
                            curPage = parseInt(await page.$eval('#curPCA', elem => elem.value));
                            console.log(`Waiting... Current Page: ${curPage}`)
                            if (previousPage !== curPage) {
                                console.log(`Moved to next page!!!`)
                                break;
                            }

                            await page.waitFor(10);
                        }


                    } // end of page processing

                    let data = {
                        auctionDay: auctionDay,
                        county: countyName,
                        dataType: dataType,
                        maxPagesW: maxPagesW,
                        maxPagesC: maxPagesC,
                        items: items,
                        pagesProcessed: pagesProcessed,
                        classSelector: classSelector,
                        auctionClassItemCount: auctionClassItemCount,
                    }

                    return data
                }  // end of ScrapeIt

                let result_W = await scrapeIt(classSelectorW,maxPagesW,curPageSelectorW)
                let result_C = await scrapeIt(classSelectorC,maxPagesC,curPageSelectorC)

                let resultCombined = []
                resultCombined.push(result_W)
                resultCombined.push(result_C)

                let result = {
                    auctionDay: auctionDay,
                    county: countyName,
                    resultCombined: resultCombined,
                }

                listings.push(result);

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