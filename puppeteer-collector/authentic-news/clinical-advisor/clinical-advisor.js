const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 });
        const page = await browser.newPage();
        await page.goto('https://www.clinicaladvisor.com/features/');

        const articleSelector = '.title a'; // Selector for each article title and link
        const nextPageSelector = 'a.next.page-numbers'; // Selector for the "Next Page" button

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        for (let pageNumber = 1; pageNumber <= 20; pageNumber++) {
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 5000 });

                // Extract links and titles
                const articles = await page.evaluate((articleSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const link = article.href; // Full URL is already provided
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

                console.log(`Page ${pageNumber} scraped. Articles found: ${articles.length}`);

                // Navigate to the next page
                const nextPageButton = await page.$(nextPageSelector);
                if (nextPageButton) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }), // Wait for navigation to complete
                        nextPageButton.click(), // Click the "Next Page" button
                    ]);
                } else {
                    console.log("No more pages to scrape.");
                    break; // Exit loop if no "Next Page" button
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