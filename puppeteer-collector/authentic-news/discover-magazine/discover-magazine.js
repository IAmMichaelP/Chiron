const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 });
        const page = await browser.newPage();
        await page.goto('https://www.discovermagazine.com/health/1');

        const moreButtonSelector = 'button.sc-c8bbe1ac-0.sc-e8711556-0.haeKWy.jrfEVW'; // Selector for the "See More" button
        const articleSelector = 'a.sc-acb0869a-0.cgZEsQ.sc-61d99178-1.eSTMOo'; // Selector for each article title and link

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        for (let i = 0; i < 20; i++) {
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 5000 });

                // Extract links and titles
                const articles = await page.evaluate((articleSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const link = `https://www.discovermagazine.com${article.href}`; // Construct full URL
                        const title = article.innerText.trim();
                        return { link, title };
                    });
                }, articleSelector);

                // Add new articles to results, avoiding duplicates
                articles.forEach(article => {
                    if (article.link && article.title && !uniqueLinks.has(article.link)) {
                        results.push(article);
                        uniqueLinks.add(article.link);
                    }
                });

                console.log(`Iteration ${i + 1}: ${articles.length} articles scraped.`);

                // Try clicking the "See More" button, if available
                const moreButton = await page.$(moreButtonSelector);
                if (moreButton) {
                    await moreButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for new content to load
                } else {
                    console.log("No more articles to load.");
                    break; // Exit loop if no "See More" button
                }
            } catch (error) {
                console.error(`Error during iteration ${i + 1}:`, error);
                break; // Exit loop if an error occurs
            }
        }

        // Save results to CSV
        const csvPath = path.join(__dirname, "scraped_data.csv");
        const writer = csvWriter({
            path: csvPath,
            header: [
                { id: "link", title: "link" },
                { id: "title", title: "title" }
            ]
        });

        await writer.writeRecords(results);
        console.log(`Scraping complete. Data saved to ${csvPath}`);
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) await browser.close();
    }
})();