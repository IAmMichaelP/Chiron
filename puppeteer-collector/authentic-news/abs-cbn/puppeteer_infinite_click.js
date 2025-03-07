const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false, slowMo: 70 });
        const page = await browser.newPage();
        await page.goto('https://www.abs-cbn.com/news/health-science');

        const moreButtonSelector = '.MuiButtonBase-root.MuiButton-textPrimary.css-34fiem';
        const articleSelector = '.MuiTypography-root.MuiTypography-inherit.MuiLink-root';
        const titleSelector = 'h3';

        let results = [];

        while (true) {
            // Wait for articles to load
            await page.waitForSelector(articleSelector, { timeout: 5000 });

            // Extract links and titles
            const articles = await page.evaluate((articleSelector, titleSelector) => {
                return Array.from(document.querySelectorAll(articleSelector)).map(article => {
                    const link = article.href;
                    const titleElement = article.querySelector(titleSelector);
                    const title = titleElement ? titleElement.innerText.trim() : "No Title";
                    console.log('here is the title and link: ', link, title);
                    return { link, title };
                });
            }, articleSelector, titleSelector);

            results.push(...articles);

            // Try clicking the "More" button, if available
            const moreButton = await page.$(moreButtonSelector);
            if (moreButton) {
                await moreButton.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                break; // Exit loop if no "More" button
            }
        }

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
