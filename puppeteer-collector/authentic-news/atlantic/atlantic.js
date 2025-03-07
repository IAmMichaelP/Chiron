const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 });
        const page = await browser.newPage();
        await page.goto('https://www.theatlantic.com/health/');

        const moreButtonSelector = '.LandingRiver_paginationLink__4oDwT'; // Selector for the "More" button
        const articleSelector = '.LandingRiver_promoItem__SLYUT'; // Selector for each article
        const titleSelector = '.LandingRiver_title__wdvvu'; // Selector for the title
        const descriptionSelector = '.LandingRiver_dek__OyPEv'; // Selector for the description

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        for (let i = 0; i < 10; i++) {
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 5000 });

                // Extract links, titles, and descriptions
                const articles = await page.evaluate((articleSelector, titleSelector, descriptionSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const linkElement = article.querySelector('a');
                        const link = linkElement ? linkElement.href : null;
                        const titleElement = article.querySelector(titleSelector);
                        const title = titleElement ? titleElement.innerText.trim() : "No Title";
                        const descriptionElement = article.querySelector(descriptionSelector);
                        const description = descriptionElement ? descriptionElement.innerText.trim() : "";
                        const fullTitle = `${title} - ${description}`; // Combine title and description
                        return { link, title: fullTitle };
                    });
                }, articleSelector, titleSelector, descriptionSelector);

                // Add new articles to results, avoiding duplicates
                articles.forEach(article => {
                    if (article.link && article.title && !uniqueLinks.has(article.link)) {
                        results.push(article);
                        uniqueLinks.add(article.link);
                    }
                });

                // Try clicking the "More" button, if available
                const moreButton = await page.$(moreButtonSelector);
                if (moreButton) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }), // Wait for navigation to complete
                        moreButton.click(), // Click the "More" button
                    ]);
                } else {
                    break; // Exit loop if no "More" button
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