const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-write-stream");

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 }); // Set headless: true for faster execution
        const page = await browser.newPage();
        await page.goto('https://healthnutnews.com/category/health/', { waitUntil: 'networkidle2' });

        const articleSelector = 'div.post-content'; // Selector for each article block
        const titleSelector = 'h2.post-title a'; // Selector for the title
        const authorSelector = 'div.post-meta a[rel="author"]'; // Selector for the author
        const dateSelector = 'span.updated'; // Selector for the date
        const nextPageSelector = 'li.next.arrow a'; // Selector for the "Next" button

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        while (true) {
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 10000 }); // Increased timeout

                // Extract article details
                const articles = await page.evaluate((articleSelector, titleSelector, authorSelector, dateSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const titleElement = article.querySelector(titleSelector);
                        const title = titleElement ? titleElement.innerText.trim() : null;
                        const link = titleElement ? titleElement.href : null;
                        const authorElement = article.querySelector(authorSelector);
                        const author = authorElement ? authorElement.innerText.trim() : null;
                        const dateElement = article.querySelector(dateSelector);
                        const date = dateElement ? dateElement.innerText.trim() : null;
                        return { title, link, author, date };
                    });
                }, articleSelector, titleSelector, authorSelector, dateSelector);

                // Filter out articles with no title or no link
                const validArticles = articles.filter(article => article.title && article.link);

                // Add new articles to results, avoiding duplicates
                validArticles.forEach(article => {
                    if (article.link && !uniqueLinks.has(article.link)) {
                        results.push(article);
                        uniqueLinks.add(article.link);
                    }
                });

                console.log(`Articles found: ${validArticles.length}`);

                // Check if there is a next page
                const nextPageButton = await page.$(nextPageSelector);
                if (nextPageButton) {
                    console.log("Navigating to the next page...");
                    
                    // Wait for the button to be visible and clickable
                    await page.waitForSelector(nextPageSelector, { visible: true });
                    
                    // Ensure the button is clickable
                    await page.evaluate((nextPageSelector) => {
                        const nextPageButton = document.querySelector(nextPageSelector);
                        nextPageButton.scrollIntoView();
                    }, nextPageSelector);
                    
                    await nextPageButton.click(); // Click the "Next" button
                    await page.waitForSelector(articleSelector, { timeout: 10000 }); // Wait for new articles to load
                } else {
                    console.log("No more pages to scrape.");
                    break; // Exit loop if no "Next" button
                }
            } catch (error) {
                console.error("Error during scraping:", error);
                break; // Exit loop if an error occurs
            }
        }

        // Save results to CSV
        const csvPath = path.join(__dirname, "scraped_data.csv");
        const writer = csvWriter({
            headers: ["title", "link", "author", "date"]
        });
        writer.pipe(fs.createWriteStream(csvPath));
        results.forEach(result => writer.write(result));
        writer.end();

        console.log(`Scraping complete. Data saved to ${csvPath}`);
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) await browser.close();
    }
})();
