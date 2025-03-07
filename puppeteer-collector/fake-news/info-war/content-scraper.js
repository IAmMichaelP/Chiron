const puppeteer = require("puppeteer");
const Papa = require('papaparse');
const fs = require('fs');

const csvFilePath = 'cleaned_scraped_data.csv'; // Replace with your CSV file path
const targetColumn = 'link'; // Replace with the name of the column you want to sift through

// Read the CSV file
const csvFile = fs.readFileSync(csvFilePath, 'utf8');

// Define the delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
    let browser;
    try {
        // Parse the CSV file
        Papa.parse(csvFile, {
            header: true, // Treat the first row as headers
            dynamicTyping: true, // Automatically convert numeric values to numbers
            complete: async (results) => {
                // Access the parsed data
                const rows = results.data;

                // Sift through the target column
                for (const row of rows) {
                    const columnValue = row[targetColumn];
                    console.log(`Processing: ${columnValue}`);

                    // Launch Puppeteer and process the URL
                    const browser = await puppeteer.launch({ headless: false, slowMo: 0 }); // Set headless: true for faster execution
                    const page = await browser.newPage();

                    try {
                        await page.goto(columnValue, { waitUntil: 'networkidle2' });

                        const contentSelector = '.article-details p'; // Selector for the content paragraphs

                        // Wait for the selector to appear on the page
                        await page.waitForSelector(contentSelector, { timeout: 5000 });

                        // Use page.$$eval to retrieve all matching elements
                        const paragraphs = await page.$$eval(contentSelector, (elements) => {
                            return elements.map(el => el.textContent.trim());
                        });
                        paragraphs.pop(); // Remove the last element if necessary

                        // Log the paragraphs
                        console.log(paragraphs);

                        // Add the scraped content to the row
                        row['content'] = paragraphs.join('\n'); // Combine paragraphs into a single string

                        // Introduce a 15-second delay before processing the next row
                        await delay(5000);
                    } catch (error) {
                        console.error(`Error processing ${columnValue}:`, error);
                        row['content'] = 'Error: Could not scrape content'; // Add error message to the row
                    } finally {
                        await browser.close();
                    }
                }

                // Save the updated data back to the CSV file
                const updatedCsv = Papa.unparse(rows, { header: true });
                fs.writeFileSync(csvFilePath, updatedCsv, 'utf8');
                console.log('Scraped data saved to CSV file.');
            },
            error: (error) => {
                console.error('Error parsing CSV file:', error);
            },
        });
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) await browser.close();
    }
})();