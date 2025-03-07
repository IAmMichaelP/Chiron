const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 });
        const page = await browser.newPage();
        await page.goto('https://abcnews.go.com/health');

        const articleSelector = '.ContentRoll__Item';
        const titleSelector = '.ContentRoll__Headline h2 a';

        let results = [];

        // Wait for articles to load
        await page.waitForSelector(articleSelector, { timeout: 5000 });

        // Extract links and titles
        const articles = await page.evaluate((articleSelector, titleSelector) => {
            return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                const linkElement = article.querySelector(titleSelector);
                const link = linkElement ? linkElement.href : null;
                const title = linkElement ? linkElement.innerText.trim() : "No Title";
                return { link, title };
            });
        }, articleSelector, titleSelector);

        results.push(...articles.filter(article => article.link && article.title && article.title !== "No Title"));

        // Save results to CSV
        const csvPath = path.join(__dirname, "scraped_data.csv");
        const writer = csvWriter({ path: csvPath, header: [
            { id: "link", title: "link" },
            { id: "title", title: "title" }
        ] });
        
        await writer.writeRecords(results);
        console.log(`Scraping complete. Data saved to ${csvPath}`);
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) await browser.close();
    }
})();