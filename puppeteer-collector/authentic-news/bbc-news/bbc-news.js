const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 });
        const page = await browser.newPage();
        await page.goto('https://www.bbc.com/news/health');

        const articleSelector = '.ssrcss-1q6wa5h-LinkPostContent'; // Selector for each article
        const titleSelector = '.ssrcss-yjj6jm-LinkPostHeadline'; // Selector for the title

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        for (let pageNumber = 1; pageNumber <= 20; pageNumber++) {
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 5000 });

                // Extract links and titles
                const articles = await page.evaluate((articleSelector, titleSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const linkElement = article.querySelector('a');
                        const link = linkElement ? `${linkElement.href}` : null; // Ensure full URL
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

                // Navigate to the next page
                if (pageNumber < 20) {
                    const nextPageSelector = `a[href="?page=${pageNumber + 1}"]`; // Dynamic selector for the next page
                    const nextPageButton = await page.$(nextPageSelector);
                    if (nextPageButton) {
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'networkidle2' }), // Wait for navigation to complete
                            nextPageButton.click(), // Click the "Next Page" button
                        ]);
                    } else {
                        break; // Exit loop if no "Next Page" button
                    }
                }
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