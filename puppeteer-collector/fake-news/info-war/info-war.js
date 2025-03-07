const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 50 }); // Set headless: true for faster execution
        const page = await browser.newPage();
        await page.goto('https://www.infowars.com/category/health', { waitUntil: 'networkidle2' });

        const articleSelector = 'div._postContent_1l3h4_22'; // Selector for each article block
        const titleSelector = 'h4 a'; // Selector for the title
        const authorSelector = 'span._author_1l3h4_57'; // Selector for the author
        const dateSelector = 'span._date_1l3h4_65'; // Selector for the date

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        // Function to scroll down the page
        const scrollDown = async () => {
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight); // Scroll down by one viewport height
            });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for new content to load
        };

        // Scroll and scrape multiple times
        const scrollCount = 100; // Number of times to scroll down
        for (let i = 0; i < scrollCount; i++) {
            console.log(`Scrolling ${i + 1}/${scrollCount}...`);
            await scrollDown();

            // Extract articles after each scroll
            const articles = await page.evaluate((articleSelector, titleSelector, authorSelector, dateSelector) => {
                return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                    const linkElement = article.querySelector(titleSelector);
                    const link = linkElement ? `https://www.infowars.com${linkElement.href}` : null; // Construct full URL
                    const title = linkElement ? linkElement.innerText.trim() : "No Title";
                    const authorElement = article.querySelector(authorSelector);
                    const author = authorElement ? authorElement.innerText.trim() : "No Author";
                    const dateElement = article.querySelector(dateSelector);
                    const date = dateElement ? dateElement.innerText.trim() : "No Date";
                    return { link, title, author, date };
                });
            }, articleSelector, titleSelector, authorSelector, dateSelector);

            // Add new articles to results, avoiding duplicates
            articles.forEach(article => {
                if (article.link && article.title && !uniqueLinks.has(article.link)) {
                    results.push(article);
                    uniqueLinks.add(article.link);
                }
            });

            console.log(`Articles found so far: ${results.length}`);
        }

        // Save results to CSV
        const csvPath = path.join(__dirname, "scraped_data.csv");
        const writer = csvWriter({
            path: csvPath,
            header: [
                { id: "link", title: "link" },
                { id: "title", title: "title" },
                { id: "author", title: "author" },
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
