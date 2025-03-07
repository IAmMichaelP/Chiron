const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 }); // Set headless: true for faster execution
        const page = await browser.newPage();
        await page.goto('https://childrenshealthdefense.org/defender-news/', { waitUntil: 'networkidle2' });

        const articleSelector = 'div > a[href]'; // Selector for each article block
        const titleSelector = 'h4'; // Selector for the title
        const dateSelector = 'span.date'; // Selector for the date
        const nextPageSelector = 'a.nextpostslink'; // Selector for the "Next" button

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        for (let pageNumber = 1; pageNumber <= 50; pageNumber++) { // Adjust the number of pages to scrape
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 5000 });

                // Extract links, titles, and dates
                const articles = await page.evaluate((articleSelector, titleSelector, dateSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const link = article.href; // Full URL is already provided
                        const titleElement = article.querySelector(titleSelector);
                        const title = titleElement ? titleElement.innerText.trim() : null;
                        const dateElement = article.closest('div').querySelector(dateSelector);
                        const date = dateElement ? dateElement.innerText.trim() : null;
                        return { link, title, date };
                    });
                }, articleSelector, titleSelector, dateSelector);

                // Filter out articles with no title or no date
                const validArticles = articles.filter(article => article.title && article.date);

                // Add new articles to results, avoiding duplicates
                validArticles.forEach(article => {
                    if (article.link && !uniqueLinks.has(article.link)) {
                        results.push(article);
                        uniqueLinks.add(article.link);
                    }
                });

                console.log(`Page ${pageNumber} scraped. Articles found: ${validArticles.length}`);

                // Navigate to the next page
                const nextPageButton = await page.$(nextPageSelector);
                if (nextPageButton) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2' }), // Wait for navigation to complete
                        nextPageButton.click(), // Click the "Next" button
                    ]);
                } else {
                    console.log("No more pages to scrape.");
                    break; // Exit loop if no "Next" button
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
                { id: "title", title: "title" },
                { id: "date", title: "date" }
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