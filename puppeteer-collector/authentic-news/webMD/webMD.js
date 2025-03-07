const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 });
        const page = await browser.newPage();

        const baseUrl = 'https://www.webmd.com/news/articles';
        const articleSelector = 'a.no-image'; // Selector for each article
        const titleSelector = 'span.title'; // Selector for the title

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        for (let pageNumber = 1; pageNumber <= 50; pageNumber++) {
            try {
                // Navigate to the current page
                const url = pageNumber === 1 ? baseUrl : `${baseUrl}?pg=${pageNumber}`;
                await page.goto(url, { waitUntil: 'networkidle2' });

                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 5000 });

                // Extract links and titles
                const articles = await page.evaluate((articleSelector, titleSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const link = article.href; // Full URL is already provided
                        const titleElement = article.querySelector(titleSelector);
                        const title = titleElement ? titleElement.innerText.trim() : "No Title";
                        return { link, title };
                    });
                }, articleSelector, titleSelector);

                // Add new articles to results, avoiding duplicates
                articles.forEach(article => {
                    if (article.link && article.title && !uniqueLinks.has(article.link)) {
                        results.push(article);
                        uniqueLinks.add(article.link);
                    }
                });

                console.log(`Page ${pageNumber} scraped. Articles found: ${articles.length}`);
            } catch (error) {
                console.error(`Error during iteration ${pageNumber}:`, error);
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