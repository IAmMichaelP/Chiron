const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-write-stream");

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 0 }); // Set headless: true for faster execution
        const page = await browser.newPage();
        await page.goto('https://naturalblaze.com/category/natural-health-news/', { waitUntil: 'networkidle2' });

        const articleSelector = 'div.content-body'; // Selector for each article block
        const titleSelector = 'h2.content-title a'; // Selector for the title
        const dateSelector = 'time.entry-date'; // Selector for the date
        const categorySelector = 'span.cat-links a'; // Selector for the category
        const excerptSelector = 'div.content-text p'; // Selector for the excerpt
        const nextPageSelector = 'a.next.page-numbers'; // Selector for the "Next page" button

        let results = [];
        let uniqueLinks = new Set(); // To track unique articles

        while (true) {
            try {
                // Wait for articles to load
                await page.waitForSelector(articleSelector, { timeout: 10000 }); // Increased timeout

                // Extract article details
                const articles = await page.evaluate((articleSelector, titleSelector, dateSelector, categorySelector, excerptSelector) => {
                    return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                        const titleElement = article.querySelector(titleSelector);
                        const title = titleElement ? titleElement.innerText.trim() : null;
                        const link = titleElement ? titleElement.href : null;
                        const dateElement = article.querySelector(dateSelector);
                        const date = dateElement ? dateElement.innerText.trim() : null;
                        const categoryElement = article.querySelector(categorySelector);
                        const category = categoryElement ? categoryElement.innerText.trim() : null;
                        const excerptElement = article.querySelector(excerptSelector);
                        const excerpt = excerptElement ? excerptElement.innerText.trim() : null;
                        return { title, link, date, category, excerpt };
                    });
                }, articleSelector, titleSelector, dateSelector, categorySelector, excerptSelector);

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
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }), // Wait for navigation to complete
                        nextPageButton.click(), // Click the "Next page" button
                    ]);
                } else {
                    console.log("No more pages to scrape.");
                    break; // Exit loop if no "Next page" button
                }
            } catch (error) {
                console.error("Error during scraping:", error);
                break; // Exit loop if an error occurs
            }
        }

        // Save results to CSV
        const csvPath = path.join(__dirname, "scraped_data.csv");
        const writer = csvWriter({
            headers: ["title", "link", "date", "category", "excerpt"]
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