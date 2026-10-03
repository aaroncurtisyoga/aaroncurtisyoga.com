import { chromium, ElementHandle } from "playwright-core";
import { toEasternDate } from "@/app/_lib/utils/timezone";

interface MomenceClass {
  id: string;
  title: string;
  instructor: string;
  startDateTime: Date;
  endDateTime: Date;
  bookingUrl: string;
  price?: string;
}

interface ParsedClass extends MomenceClass {
  dateParsingFailed?: boolean;
}

export class BrightBearCrawler {
  private baseUrl = "https://www.brightbearyogadc.com/book-a-class";

  async getAaronClasses(): Promise<MomenceClass[]> {
    console.log("🔄 Launching browser for web scraping...");

    // Always use Browserless to ensure consistency across environments
    if (!process.env.BROWSERLESS_API_TOKEN) {
      throw new Error("BROWSERLESS_API_TOKEN is required for web scraping");
    }

    const browser = await chromium.connectOverCDP(
      `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_API_TOKEN}`,
    );

    try {
      const context = await browser.newContext({
        timezoneId: "America/New_York",
      });
      const page = await context.newPage();

      // Set page timeout to 30 seconds instead of default 30s
      page.setDefaultTimeout(30000);

      console.log(`📍 Navigating to ${this.baseUrl}...`);
      await page.goto(this.baseUrl, {
        waitUntil: "domcontentloaded", // Changed from networkidle to domcontentloaded for faster load
        timeout: 20000,
      });

      // Wait for the async content to load - look for the session list container
      console.log("⏳ Waiting for async content to load...");
      await page.waitForSelector(
        ".momence-host_schedule-session_list",
        { timeout: 15000 }, // Increased timeout
      );

      // Skip screenshot when using Browserless to save time
      // Uncomment for debugging if needed:
      // await page.screenshot({ path: "debug-screenshot.png" });
      // console.log("📸 Screenshot saved to debug-screenshot.png");

      // Log the page content to see what's there
      const pageTitle = await page.title();
      console.log(`📄 Page title: ${pageTitle}`);

      // Look for ALL dropdown buttons on the page to find the instructor one
      const allDropdowns = await page.$$(
        'button[id*="headlessui-listbox-button"]',
      );

      console.log(`📋 Found ${allDropdowns.length} dropdown(s) on page...`);
      console.log("🔍 Searching for instructor dropdown...");

      // Find the instructor dropdown by checking button text
      let instructorDropdown: ElementHandle<HTMLElement | SVGElement> | null =
        null;
      for (const dropdown of allDropdowns) {
        const buttonText = await dropdown.textContent();
        console.log(`Dropdown text: ${buttonText}`);

        // The instructor dropdown should contain instructor names or "All Instructors"
        if (
          buttonText?.includes("Instructor") ||
          buttonText?.includes("Aaron") ||
          buttonText?.includes("All") ||
          buttonText?.includes("Select")
        ) {
          instructorDropdown = dropdown;
          console.log(`✅ Found instructor dropdown with text: ${buttonText}`);
          break;
        }
      }

      if (instructorDropdown) {
        // Check if Aaron is already selected by looking at the button text
        const buttonText = await instructorDropdown.textContent();
        console.log(`Current instructor selection: ${buttonText}`);

        if (!buttonText?.includes("Aaron Curtis")) {
          console.log("🔄 Aaron not selected, clicking dropdown...");

          // Click on the dropdown to open it
          await instructorDropdown.click();
          await page.waitForTimeout(1500);

          // Wait for dropdown options to appear
          await page.waitForSelector('[role="listbox"]', { timeout: 5000 });

          // Look for Aaron Curtis option - try multiple selectors
          let aaronOption = await page.$(
            'li[role="option"]:has-text("Aaron Curtis")',
          );
          if (!aaronOption) {
            aaronOption = await page.$(
              'div[role="option"]:has-text("Aaron Curtis")',
            );
          }
          if (!aaronOption) {
            aaronOption = await page.$("text=/Aaron Curtis/i");
          }

          if (aaronOption) {
            console.log("✅ Found Aaron in dropdown, selecting...");
            await aaronOption.click();

            // Wait for the page to reload/filter after selection
            console.log("⏳ Waiting for page to filter classes...");
            await page.waitForTimeout(3000);

            // Verify selection was successful
            const newButtonText = await instructorDropdown.textContent();
            console.log(`New selection: ${newButtonText}`);

            if (!newButtonText?.includes("Aaron Curtis")) {
              console.log("⚠️ Selection may have failed, continuing anyway...");
            }
          } else {
            console.log("⚠️ Aaron Curtis not found in dropdown options");
            console.log("📋 Available options:");
            const options = await page.$$('[role="option"], li[role="option"]');
            for (const option of options) {
              const text = await option.textContent();
              console.log(`  - ${text}`);
            }
          }
        } else {
          console.log("✅ Aaron Curtis already selected");
        }
      } else {
        console.log("⚠️ Instructor dropdown not found");
        console.log("📋 Available dropdowns texts:");
        for (const dropdown of allDropdowns) {
          const text = await dropdown.textContent();
          console.log(`  - ${text}`);
        }
      }

      // Extract classes from the page using the correct Momence selectors
      console.log("🔍 Starting class extraction from Momence widget...");
      console.log("📊 Extracting session data from DOM...");

      const classes = await page.evaluate(() => {
        const results: any[] = [];
        const debugInfo = {
          totalArticles: 0,
          articlesWithInstructor: 0,
          articlesWithDate: 0,
          articlesWithPrice: 0,
          articlesProcessed: 0,
          cancelledClasses: 0,
        };

        // Target the specific class article elements in the Momence session list
        const classElements = document.querySelectorAll(
          "article[data-session_id]",
        );

        debugInfo.totalArticles = classElements.length;
        console.log(`Found ${classElements.length} class articles`);

        classElements.forEach((article: any) => {
          // Check if the class is cancelled.
          // Match only the past-tense word ("cancelled" / "canceled") so we don't
          // accidentally trip on things like "Cancellation policy" links or
          // "Cancel booking" tooltips that appear on active class cards.
          const fullText = article.textContent?.toLowerCase() || "";
          const isCancelled = /\bcancell?ed\b/.test(fullText);

          // Also check if book button is disabled (another indicator of cancelled class)
          const bookButton = article.querySelector('a[href*="momence.com/s/"]');
          const isBookButtonDisabled =
            bookButton?.classList?.contains("disabled") ||
            bookButton?.getAttribute("disabled") !== null ||
            bookButton?.getAttribute("aria-disabled") === "true";

          if (isCancelled || isBookButtonDisabled) {
            const sessionId = article.getAttribute("data-session_id") || "";
            console.log(
              `Skipping cancelled class (session ${sessionId}): cancel=${isCancelled}, buttonDisabled=${isBookButtonDisabled}`,
            );
            debugInfo.cancelledClasses++;
            return; // Skip this class
          }

          // Extract class title - use stable momence class and fallback to h4
          const titleEl = article.querySelector(
            ".momence-host_schedule-session_list-item-title, h4",
          );
          const title = titleEl?.textContent?.trim() || "";

          // Extract instructor name - use stable class or look for name pattern
          let instructorEl = article.querySelector(
            ".momence-session-teacher .sc-czlrj2-2, .momence-session-teacher div:nth-child(2) div",
          );
          if (!instructorEl) {
            // Fallback: look for text pattern with pronouns and "Show bio"
            const teacherSection = article.querySelector(
              ".momence-session-teacher",
            );
            if (teacherSection) {
              const text = teacherSection.textContent || "";
              const nameMatch = text.match(
                /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\([^)]*\)/,
              );
              if (nameMatch) {
                instructorEl = { textContent: nameMatch[1] };
              }
            }
          }
          let instructor = instructorEl?.textContent?.trim() || "";
          instructor = instructor.replace(/Show bio/gi, "").trim();

          // Extract date from the date label preceding this article
          let dateTime = "";

          // Search backwards through siblings to find the nearest date label
          // (Multiple classes on the same day share the same date label)
          let sibling = article.previousElementSibling;
          while (sibling) {
            if (
              sibling.classList.contains(
                "momence-host_schedule-session_list-date_label",
              )
            ) {
              const dateText = sibling.textContent?.trim() || "";
              dateTime = dateText;
              break;
            }
            sibling = sibling.previousElementSibling;
          }

          // Get the time from within the article using stable class
          const timeEl = article.querySelector(
            ".momence-session-duration, .momence-host_schedule-session_list-item-info.momence-session-duration",
          );
          if (timeEl) {
            const timeText = timeEl.textContent?.trim() || "";
            // Extract time range and duration (e.g., "6:30 AM - 7:15 AM 45 min")
            const timeMatch = timeText.match(/(\d{1,2}:\d{2}\s*[AP]M)/);
            if (timeMatch && dateTime) {
              dateTime += ` ${timeMatch[1]}`;
            }
          }

          // Extract price - look for $ sign pattern as fallback
          let priceEl = article.querySelector(
            ".momence-host_schedule-session_list-item-price div:last-child",
          );
          if (!priceEl) {
            // Fallback: find any element containing price pattern
            const allElements = article.querySelectorAll("*");
            for (const el of allElements) {
              if (el.textContent && el.textContent.match(/^\$\d+$/)) {
                priceEl = el;
                break;
              }
            }
          }
          const price = priceEl?.textContent?.trim() || "";

          // Extract booking URL from the "Book now" link - this should be stable
          const bookingLinkEl = article.querySelector(
            'a[href*="momence.com/s/"]',
          );
          const bookingUrl = bookingLinkEl?.getAttribute("href") || "";

          // Extract session ID for unique identification - this is stable
          const sessionId = article.getAttribute("data-session_id") || "";

          // Extract class type - use stable class or look for "Class" text
          let classTypeEl = article.querySelector(
            ".momence-host_schedule-session_list-item-type",
          );
          if (!classTypeEl) {
            // Fallback: look for h3 containing "Class"
            classTypeEl = article.querySelector("h3");
          }
          const classType = classTypeEl?.textContent?.trim() || "";

          // Extract description - use stable class or look for long text content
          let descriptionEl = article.querySelector(
            ".momence-host_schedule-session_list-item-description",
          );
          if (!descriptionEl) {
            // Fallback: look for div with title attribute (description preview)
            descriptionEl = article.querySelector("div[title]");
          }
          const description =
            descriptionEl?.textContent?.trim() ||
            descriptionEl?.getAttribute("title")?.trim() ||
            "";

          if (instructor) debugInfo.articlesWithInstructor++;
          if (dateTime) debugInfo.articlesWithDate++;
          if (price) debugInfo.articlesWithPrice++;
          debugInfo.articlesProcessed++;

          if (title && instructor && sessionId) {
            console.log(`Processing class: ${title} by ${instructor}`);
            results.push({
              title,
              instructor,
              dateTime,
              price,
              bookingUrl,
              sessionId,
              classType,
              description: description.substring(0, 200), // Truncate long descriptions
              debug: {
                sessionId,
                textContent: article.textContent?.substring(0, 300),
                htmlSnippet: article.outerHTML.substring(0, 500),
              },
            });
          }
        });

        console.log("Extraction debug info:", debugInfo);
        return { results, debugInfo };
      });

      const extractedClasses = classes.results || classes;
      const debugInfo = classes.debugInfo;

      console.log(
        `✅ Found ${Array.isArray(extractedClasses) ? extractedClasses.length : 0} total classes on page`,
      );
      if (debugInfo) {
        console.log("📊 Extraction statistics:");
        console.log(`  - Total articles: ${debugInfo.totalArticles}`);
        console.log(
          `  - Articles with instructor: ${debugInfo.articlesWithInstructor}`,
        );
        console.log(`  - Articles with date: ${debugInfo.articlesWithDate}`);
        console.log(`  - Articles with price: ${debugInfo.articlesWithPrice}`);
        console.log(
          `  - Cancelled classes skipped: ${debugInfo.cancelledClasses}`,
        );
      }
      if (Array.isArray(extractedClasses) && extractedClasses.length > 0) {
        console.log("📝 Sample class data:", extractedClasses[0]);
      }

      // Filter for Aaron's classes explicitly and parse them
      console.log("🔎 Filtering for Aaron Curtis classes...");
      const aaronRawClasses = Array.isArray(extractedClasses)
        ? extractedClasses.filter((cls) => {
            const isAaron =
              cls.instructor?.toLowerCase().includes("aaron") ||
              cls.instructor?.toLowerCase().includes("curtis");
            if (!isAaron && cls.instructor) {
              console.log(
                `Filtering out class by ${cls.instructor}: ${cls.title}`,
              );
            }
            return isAaron;
          })
        : [];

      console.log(
        `✅ Found ${aaronRawClasses.length} classes specifically for Aaron Curtis`,
      );

      if (aaronRawClasses.length === 0) {
        console.warn(
          "⚠️ No Aaron Curtis classes found - check instructor filter",
        );
      } else {
        console.log("📅 Parsing class dates and times...");
      }

      const parsedClasses = aaronRawClasses.map((cls, index) => {
        console.log(
          `  [${index + 1}/${aaronRawClasses.length}] Parsing: ${cls.title} on ${cls.dateTime}`,
        );
        return this.parseClassData(cls);
      });

      // Filter out classes where date parsing failed
      const aaronClasses = parsedClasses.filter((cls) => {
        if (cls.dateParsingFailed) {
          console.warn(
            `⚠️ Skipping class "${cls.title}" due to failed date parsing`,
          );
          return false;
        }
        return true;
      });

      const skippedCount = parsedClasses.length - aaronClasses.length;
      if (skippedCount > 0) {
        console.warn(
          `⚠️ Skipped ${skippedCount} class(es) due to date parsing failures`,
        );
      }

      console.log(
        `🎯 Successfully parsed ${aaronClasses.length} Aaron Curtis classes`,
      );
      console.log("✨ Bright Bear crawl complete");

      return aaronClasses;
    } catch (error) {
      console.error("❌ Error crawling Bright Bear:", error);
      throw error;
    } finally {
      console.log("🔒 Closing browser connection...");
      await browser.close();
      console.log("✅ Browser closed successfully");
    }
  }

  private parseClassData(rawClass: any): ParsedClass {
    let startDateTime: Date | null = null;
    let endDateTime: Date | null = null;
    let dateParsingFailed = true;

    // Instructor is already cleaned
    const instructor = rawClass.instructor || "Aaron Curtis";

    // Parse date and time - improved parsing for Momence format
    if (rawClass.dateTime) {
      console.log(`    📅 Parsing date/time: ${rawClass.dateTime}`);
      try {
        // The dateTime comes in formats like:
        // "Tuesday, September 2 6:30 AM" (missing year)
        // "Tuesday, September 9, 2025 6:30 AM" (with year)
        let dateTimeStr = rawClass.dateTime.trim();

        // Handle relative date references first
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const today = new Date();

        // Replace TOMORROW with actual date
        if (dateTimeStr.match(/^TOMORROW\s/i)) {
          const timeMatch = dateTimeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          if (timeMatch) {
            // Create date string with tomorrow's date
            const monthNames = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            dateTimeStr = `${monthNames[tomorrow.getMonth()]} ${tomorrow.getDate()}, ${tomorrow.getFullYear()} ${timeMatch[1]}`;
          }
        }
        // Replace TODAY with actual date
        else if (dateTimeStr.match(/^TODAY\s/i)) {
          const timeMatch = dateTimeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
          if (timeMatch) {
            const monthNames = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            dateTimeStr = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()} ${timeMatch[1]}`;
          }
        }
        // Handle "THIS" prefix (e.g., "THIS Friday, September 26")
        else if (dateTimeStr.match(/^THIS\s/i)) {
          dateTimeStr = dateTimeStr.replace(/^THIS\s+/i, "").trim();
        }

        // Clean up other common prefixes
        dateTimeStr = dateTimeStr.replace(/^(NEXT\s+)/i, "").trim();

        // If the date doesn't include a year, add the current year or next year
        if (!dateTimeStr.match(/\d{4}/)) {
          const currentYear = new Date().getFullYear();
          const currentMonth = new Date().getMonth(); // 0-based

          // Extract month from the date string
          const monthMatch = dateTimeStr.match(
            /(January|February|March|April|May|June|July|August|September|October|November|December)/i,
          );
          if (monthMatch) {
            const monthName = monthMatch[1];
            const monthNames = [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ];
            const extractedMonth = monthNames.findIndex(
              (m) => m.toLowerCase() === monthName.toLowerCase(),
            );

            // If the extracted month is before current month, assume next year
            const yearToUse =
              extractedMonth < currentMonth ? currentYear + 1 : currentYear;

            // Insert year after the day number
            dateTimeStr = dateTimeStr.replace(
              /(\d{1,2})(\s+\d{1,2}:\d{2}\s*[AP]M)/i,
              `$1, ${yearToUse}$2`,
            );
          }
        }

        // Try to parse the full date string, then re-interpret as Eastern Time
        // so it's correct regardless of server timezone (UTC on Vercel)
        const parsedDate = toEasternDate(new Date(dateTimeStr));

        // Accept dates that are from the past year onwards (for historical data)
        // or future dates within reasonable bounds
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (!isNaN(parsedDate.getTime()) && parsedDate >= oneYearAgo) {
          startDateTime = parsedDate;
          dateParsingFailed = false;
          console.log(
            `    ✅ Parsed start time: ${startDateTime.toLocaleString()}`,
          );

          // Extract duration from description or default to 45 minutes
          let duration = 45; // Default for most classes
          if (rawClass.description) {
            const durationMatch =
              rawClass.description.match(/(\d+)[\s-]*minute/i);
            if (durationMatch) {
              duration = parseInt(durationMatch[1]);
            }
          }

          endDateTime = new Date(
            startDateTime.getTime() + duration * 60 * 1000,
          );
          console.log(
            `    ✅ Calculated end time: ${endDateTime.toLocaleString()} (${duration} min class)`,
          );
        } else {
          console.warn(
            "Could not parse date after year insertion:",
            dateTimeStr,
            "original:",
            rawClass.dateTime,
          );
          // Final fallback - try a different approach
          const dayMatch = dateTimeStr.match(
            /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2})/i,
          );
          const timeMatch = dateTimeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);

          if (dayMatch && timeMatch) {
            const [, , month, day] = dayMatch;
            const [, time] = timeMatch;
            const currentYear = new Date().getFullYear();

            // Construct a standard date string
            const standardDateStr = `${month} ${day}, ${currentYear} ${time}`;
            const attemptParse = toEasternDate(new Date(standardDateStr));

            if (!isNaN(attemptParse.getTime())) {
              startDateTime = attemptParse;
              endDateTime = new Date(startDateTime.getTime() + 45 * 60 * 1000);
              dateParsingFailed = false;
            }
          }
        }
      } catch (e) {
        console.warn(
          "Date parsing error:",
          e,
          "for dateTime:",
          rawClass.dateTime,
        );
      }
    } else {
      console.warn(`    ⚠️ No dateTime found for class: ${rawClass.title}`);
    }

    // If date parsing failed, use fallback values that will be filtered out
    if (dateParsingFailed) {
      console.warn(
        `    ❌ Date parsing failed for class: ${rawClass.title}, will be filtered out`,
      );
      const now = new Date();
      startDateTime = now;
      endDateTime = new Date(now.getTime() + 45 * 60 * 1000);
    }

    // Use session ID for unique identification if available
    const id = rawClass.sessionId
      ? `momence-${rawClass.sessionId}`
      : `momence-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const title = rawClass.title || "Yoga Class";

    if (!rawClass.bookingUrl) {
      console.warn("No booking URL found for class:", title);
    }

    return {
      id,
      title,
      instructor,
      startDateTime: startDateTime!,
      endDateTime: endDateTime!,
      bookingUrl: rawClass.bookingUrl || this.baseUrl,
      price: rawClass.price,
      dateParsingFailed,
    };
  }
}
