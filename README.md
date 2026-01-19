# Web Scraper 🕷

A TypeScript-based web crawler that extracts structured data from a website and generates a CSV report.

This project is based on Boot.dev's [Build a Web Scraper in TypeScript](https://www.boot.dev/courses/build-web-scraper-typescript) course.

## Prerequisites

- **Node.js**: Version 22.15.0 (recommended to use [nvm](https://github.com/nvm-sh/nvm) for version management)

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/pderyuga/web-scraper.git
   cd web-scraper
   ```

2. **Install Node.js version** (if using nvm)

   ```bash
   nvm use
   ```

   This will use the version specified in `.nvmrc`

3. **Install dependencies**
   ```bash
   npm install
   ```

## Usage

### Basic Command

```bash
npm run start <URL> <maxConcurrency> <maxPages>
```

### Parameters

| Parameter        | Description                         | Default | Required |
| ---------------- | ----------------------------------- | ------- | -------- |
| `URL`            | The base URL to start crawling from | -       | Yes      |
| `maxConcurrency` | Number of concurrent HTTP requests  | 5       | No       |
| `maxPages`       | Maximum number of pages to crawl    | 20      | No       |

### Examples

**Basic crawl with defaults:**

```bash
npm run start "https://example.com"
```

**Custom concurrency and page limit:**

```bash
npm run start "https://blog.boot.dev/" 3 25
```

**High-performance crawl:**

```bash
npm run start "https://example.com" 10 100
```

## Output

The crawler generates a `report.csv` file in the project root with the following columns:

| Column               | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `page_url`           | The URL of the crawled page                             |
| `h1`                 | The first H1 heading found on the page                  |
| `first_paragraph`    | The first paragraph text (prioritizes `<main>` content) |
| `outgoing_link_urls` | Semicolon-separated list of all outgoing links          |
| `image_urls`         | Semicolon-separated list of all image URLs              |

## Running Tests

```bash
npm test
```

## Project Structure

```
web-scraper/
├── src/
│   ├── index.ts        # CLI entry point
│   ├── crawl.ts        # Core crawling logic and HTML parsing
│   ├── crawl.test.ts   # Test suite
│   └── report.ts       # CSV report generation
├── .nvmrc              # Node.js version specification
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Ideas for Extending the Project

- **Scheduled crawling with email reports** - Deploy to a server, run on a timer, and send periodic email reports
- **Enhanced error handling** - Add retry logic and better error recovery for large-scale crawls
- **External link tracking** - Distinguish and count external vs internal links in reports
- **Graph visualization** - Use a graphics library to generate visual site maps showing page relationships

## License

This is an educational project. Feel free to use and modify as you learn!
