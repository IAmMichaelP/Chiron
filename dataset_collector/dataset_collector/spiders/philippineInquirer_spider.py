from scrapy.spiders import CrawlSpider
from scrapy_splash import SplashRequest


class CrawlingSpider(CrawlSpider):
    name = "pICrawler"

    # Lua script for Splash to scroll and wait for lazy-loaded content
    lua_script = """
    function main(splash, args)
      splash.private_mode_enabled = false  -- Disable private mode for better performance
      splash:set_viewport_full()  -- Set viewport to full page to handle dynamic content better
      splash:go(args.url)
      splash:wait(5)  -- Wait for the initial page load

      -- Simulate scrolling to the bottom multiple times
      for i = 1, args.scroll_depth do
        -- Scroll to bottom of the specific element
        splash:runjs([[
            const element = document.querySelector(".elementor-widget-container");
            if (element) {
                const elementBottom = element.offsetTop + element.scrollHeight;
                window.scrollTo({
                    top: elementBottom,
                    behavior: 'smooth'
                });
            }
        ]])
        splash:wait(2)  -- Wait for scroll to complete
      end

      return {
        html = splash:html(),  -- Return the rendered HTML after scrolling
      }
    end
    """

    def start_requests(self):
        url = 'https://lifestyle.inquirer.net/category/latest-stories/wellness/'
        # Send a SplashRequest with the Lua script to scroll and load content
        print('first request')
        yield SplashRequest(
            url=url,
            callback=self.parse,
            endpoint='execute',
            args={'lua_source': self.lua_script, 'timeout': 90, 'resource_timeout': 20, 'scroll_depth': 20},
            meta={'scraped_links': set(), 'scroll_count': 1}  # Track scraped links and scroll count
        )

    def parse(self, response):
        print("secondary request")
        # Extract article links and titles
        scraped_links = response.meta['scraped_links']  # Get previously scraped links
        scroll_count = response.meta['scroll_count']  # Get scroll count

        new_links = response.css('.elementor-post__title a::attr(href)').getall()
        titles = response.css('.elementor-post__title a::text').getall()

        has_new_content = False
        print("after false declaration")
        # Yield only new links that haven't been scraped yet
        for link, title in zip(new_links, titles):
            if link not in scraped_links:
                title = title.replace('\n', '').replace('\t', '').strip()
                scraped_links.add(link)  # Add to scraped links
                has_new_content = True
                yield {
                    'link': link,
                    'title': title
                }
        # Continue scrolling if there is new content
        if has_new_content:
            scroll_count += 1
            yield SplashRequest(
                url=response.url,
                callback=self.parse,
                endpoint='execute',
                args={'lua_source': self.lua_script, 'timeout': 90, 'resource_timeout': 20, 'scroll_depth': 20},
                meta={'scraped_links': scraped_links, 'scroll_count': scroll_count},
                dont_filter=True  # Avoid filtering duplicate requests
            )
        else:
            print(f"Stopped after {scroll_count} scrolls. No new content found.")
