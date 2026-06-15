export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({"src/assets": "assets"});
  eleventyConfig.addPassthroughCopy({"src/robots.txt": "robots.txt"});
  eleventyConfig.addPassthroughCopy({
    "node_modules/uplot/dist/uPlot.iife.min.js": "assets/uplot.min.js",
    "node_modules/uplot/dist/uPlot.min.css": "assets/uplot.min.css"
  });
  eleventyConfig.addFilter("twoDigit", (n) => String(n).padStart(2, "0"));
  eleventyConfig.addFilter("jsonStringify", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("toFixed", (n, digits) => Number(n).toFixed(digits ?? 2));
  eleventyConfig.addFilter("deltaSign", (n) => n > 0 ? "+" : "");
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    htmlTemplateEngine: "njk"
  };
}

