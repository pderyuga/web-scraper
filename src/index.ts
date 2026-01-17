import { argv } from "node:process";

function main() {
  if (argv.length !== 3) {
    console.error("Usage: npm run start <website url>");
    process.exit(1);
  }

  const baseURL = argv[2];

  console.log(`Starting crawl of ${baseURL}...`);
  process.exit(0);
}

main();
